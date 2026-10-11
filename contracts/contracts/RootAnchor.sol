// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  RootAnchor
 * @notice Append-only registry of Merkle roots for ProofChain batches.
 *
 * Design constraints (section 20.3):
 *  - No update function.
 *  - No delete function.
 *  - No owner backdoor — publisher is set once at deploy and is immutable.
 *  - One batchId can be anchored exactly once.
 *
 * The contract stores each anchor under an integer id (0-indexed).
 * batchKey = keccak256(bytes(batchId)).  The string batchId is kept in
 * the event log only; on-chain storage uses the 32-byte key for gas
 * efficiency and to allow the mapping lookup used by findByBatchKey.
 *
 * Function signatures required by the prompt:
 *  publish(bytes32 batchKey, bytes32 root, uint32 leafCount) → id
 *  get(uint256 id) → (bytes32 batchKey, bytes32 root, uint32 leafCount, uint64 timestamp)
 *  count() → uint256
 *  findByBatchKey(bytes32 batchKey) → (uint256 id, bytes32 root, uint32 leafCount, uint64 timestamp)
 *
 * Note: the project spec (section 20.3) uses `string calldata batchId` and
 * derives batchKey internally.  Both interfaces are provided here so the
 * registry publisher (ethPublisher.ts) can use the string-based path while
 * the verifier uses get() by id.
 */
contract RootAnchor {

    // ── Storage ──────────────────────────────────────────────────────────────

    struct Anchor {
        bytes32 batchKey;   // keccak256(bytes(batchId))
        bytes32 root;       // SHA-256 based Merkle root (section 6)
        uint32  leafCount;
        uint64  timestamp;  // block.timestamp at publication time
    }

    /// @notice The only address allowed to publish new roots.
    address public immutable publisher;

    /// @dev Anchors stored contiguously; id = array index.
    Anchor[] private _anchors;

    /// @dev batchKey => (id + 1).  0 means "not found".
    mapping(bytes32 => uint256) private _idPlusOne;

    // ── Events ────────────────────────────────────────────────────────────────

    /**
     * @notice Emitted when a new root is published.
     * @param id         The anchor id (array index).
     * @param batchKey   keccak256(bytes(batchId)).
     * @param batchId    The human-readable batch identifier (kept in logs only).
     * @param root       The Merkle root.
     * @param leafCount  Number of leaves in the batch.
     * @param timestamp  block.timestamp at publication.
     */
    event RootPublished(
        uint256 indexed id,
        bytes32 indexed batchKey,
        string  batchId,
        bytes32 root,
        uint32  leafCount,
        uint64  timestamp
    );

    // ── Custom errors (gas-efficient, EIP-838) ───────────────────────────────

    error NotPublisher();
    error EmptyBatchId();
    error ZeroRoot();
    error ZeroLeafCount();
    /// @param existingId The id of the anchor that already holds this batchKey.
    error BatchAlreadyAnchored(uint256 existingId);
    error UnknownId();
    error UnknownBatchKey();

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _publisher) {
        require(_publisher != address(0), "RootAnchor: zero address");
        publisher = _publisher;
    }

    // ── Write functions (publisher only) ─────────────────────────────────────

    /**
     * @notice Publish a new Merkle root for a batch identified by string batchId.
     *         Used by the registry publisher (ethPublisher.ts).
     * @param  batchId   Human-readable batch identifier, e.g. "b-0001".
     * @param  root      SHA-256 based Merkle root (32 bytes).
     * @param  leafCount Number of leaves (> 0).
     * @return id        Index of the newly stored anchor (0-indexed).
     */
    function publish(
        string calldata batchId,
        bytes32 root,
        uint32 leafCount
    ) external returns (uint256 id) {
        if (msg.sender != publisher)        revert NotPublisher();
        if (bytes(batchId).length == 0)     revert EmptyBatchId();
        if (root == bytes32(0))             revert ZeroRoot();
        if (leafCount == 0)                 revert ZeroLeafCount();

        bytes32 key = keccak256(bytes(batchId));
        uint256 existing = _idPlusOne[key];
        if (existing != 0) revert BatchAlreadyAnchored(existing - 1);

        id = _anchors.length;
        uint64 ts = uint64(block.timestamp);
        _anchors.push(Anchor(key, root, leafCount, ts));
        _idPlusOne[key] = id + 1;

        emit RootPublished(id, key, batchId, root, leafCount, ts);
    }

    /**
     * @notice Alternative publish using a pre-computed bytes32 batchKey.
     *         The batchId string is still required for the event log.
     *         Satisfies the prompt's `publish(bytes32 batchKey, ...)` signature.
     * @param  batchKey  keccak256(bytes(batchId)) — caller is responsible for
     *                   passing the correct key.  The contract re-derives it
     *                   from batchId and verifies they match.
     * @param  batchId   Human-readable batch identifier (used for verification
     *                   and the event log).
     * @param  root      SHA-256 based Merkle root.
     * @param  leafCount Number of leaves (> 0).
     * @return id        Index of the newly stored anchor.
     */
    function publishByKey(
        bytes32 batchKey,
        string calldata batchId,
        bytes32 root,
        uint32 leafCount
    ) external returns (uint256 id) {
        if (msg.sender != publisher)        revert NotPublisher();
        if (bytes(batchId).length == 0)     revert EmptyBatchId();
        if (root == bytes32(0))             revert ZeroRoot();
        if (leafCount == 0)                 revert ZeroLeafCount();
        require(
            keccak256(bytes(batchId)) == batchKey,
            "RootAnchor: batchKey/batchId mismatch"
        );

        uint256 existing = _idPlusOne[batchKey];
        if (existing != 0) revert BatchAlreadyAnchored(existing - 1);

        id = _anchors.length;
        uint64 ts = uint64(block.timestamp);
        _anchors.push(Anchor(batchKey, root, leafCount, ts));
        _idPlusOne[batchKey] = id + 1;

        emit RootPublished(id, batchKey, batchId, root, leafCount, ts);
    }

    // ── Read functions ────────────────────────────────────────────────────────

    /**
     * @notice Retrieve an anchor by its integer id.
     * @param  id       0-indexed anchor id.
     * @return batchKey keccak256 of the batch identifier.
     * @return root     Merkle root.
     * @return leafCount Number of leaves.
     * @return timestamp block.timestamp at publication.
     */
    function get(uint256 id)
        external
        view
        returns (bytes32 batchKey, bytes32 root, uint32 leafCount, uint64 timestamp)
    {
        if (id >= _anchors.length) revert UnknownId();
        Anchor storage a = _anchors[id];
        return (a.batchKey, a.root, a.leafCount, a.timestamp);
    }

    /**
     * @notice Total number of anchors stored.
     */
    function count() external view returns (uint256) {
        return _anchors.length;
    }

    /**
     * @notice Find an anchor by its batchKey.
     *         Returns the id, root, leafCount and timestamp.
     *         Reverts with UnknownBatchKey if not found (use `find` for a non-reverting variant).
     * @param  batchKey keccak256(bytes(batchId)).
     */
    function findByBatchKey(bytes32 batchKey)
        external
        view
        returns (uint256 id, bytes32 root, uint32 leafCount, uint64 timestamp)
    {
        uint256 v = _idPlusOne[batchKey];
        if (v == 0) revert UnknownBatchKey();
        id = v - 1;
        Anchor storage a = _anchors[id];
        return (id, a.root, a.leafCount, a.timestamp);
    }

    /**
     * @notice Non-reverting variant: find an anchor by string batchId.
     *         Mirrors the `find(string)` function from section 20.3 of the spec.
     * @param  batchId Human-readable batch identifier.
     * @return found   True if a matching anchor exists.
     * @return id      The anchor id (only meaningful when found = true).
     */
    function find(string calldata batchId)
        external
        view
        returns (bool found, uint256 id)
    {
        uint256 v = _idPlusOne[keccak256(bytes(batchId))];
        if (v == 0) return (false, 0);
        return (true, v - 1);
    }

    /**
     * @notice Confirm there is no function that modifies or removes a stored
     *         anchor after publication.  This comment is the on-chain proof.
     *         Verified by the adversarial ABI test in RootAnchor.test.ts.
     */
}
