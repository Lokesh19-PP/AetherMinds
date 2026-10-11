import React, { useState, useMemo } from 'react';
import { GitCommit, Copy, Check, ChevronRight, Layers, Info, ExternalLink, Sparkles } from 'lucide-react';

export interface MerkleTreeProps {
  levels: string[][]; // levels[0] = leaves, levels[levels.length - 1] = [root]
  onSelectLeaf?: (leafIndex: number, leafHash: string) => void;
  selectedLeafIndex?: number | null;
  className?: string;
}

interface NodeCoord {
  level: number;
  index: number;
  hash: string;
  x: number;
  y: number;
  isPromoted: boolean;
}

interface TreeLink {
  from: NodeCoord;
  to: NodeCoord;
  isPromoted: boolean;
  isActive: boolean;
}

interface FoldStep {
  step: number;
  currentHash: string;
  siblingHash?: string;
  side?: 'L' | 'R';
  parentHash: string;
  isPromoted: boolean;
}

export const MerkleTree: React.FC<MerkleTreeProps> = ({
  levels,
  onSelectLeaf,
  selectedLeafIndex: externalSelectedIndex = null,
  className = '',
}) => {
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(0);
  const selectedIndex = externalSelectedIndex !== null ? externalSelectedIndex : internalSelectedIndex;

  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Compute Proof Path for selected leaf
  const { ancestorKeys, siblingKeys, foldSteps } = useMemo(() => {
    const ancestors = new Set<string>();
    const siblings = new Set<string>();
    const folds: FoldStep[] = [];

    if (selectedIndex === null || !levels || levels.length === 0 || !levels[0] || levels[0].length === 0) {
      return { ancestorKeys: ancestors, siblingKeys: siblings, foldSteps: folds };
    }

    let curIdx = selectedIndex;
    if (curIdx < 0 || curIdx >= levels[0].length) {
      curIdx = 0;
    }

    for (let lvl = 0; lvl < levels.length; lvl++) {
      ancestors.add(`${lvl}-${curIdx}`);

      if (lvl < levels.length - 1) {
        const currentHash = levels[lvl][curIdx];
        const sibIdx = curIdx ^ 1;
        const parentIdx = Math.floor(curIdx / 2);
        const parentHash = levels[lvl + 1][parentIdx];

        if (sibIdx < levels[lvl].length) {
          siblings.add(`${lvl}-${sibIdx}`);
          const sibHash = levels[lvl][sibIdx];
          const side: 'L' | 'R' = sibIdx < curIdx ? 'L' : 'R';

          folds.push({
            step: lvl + 1,
            currentHash,
            siblingHash: sibHash,
            side,
            parentHash,
            isPromoted: false,
          });
        } else {
          // Odd node promoted unchanged
          folds.push({
            step: lvl + 1,
            currentHash,
            parentHash,
            isPromoted: true,
          });
        }

        curIdx = parentIdx;
      }
    }

    return { ancestorKeys: ancestors, siblingKeys: siblings, foldSteps: folds };
  }, [levels, selectedIndex]);

  // Layout Dimensions
  const nodeWidth = 92;
  const nodeHeight = 36;
  const levelGapY = 72;
  const numLevels = levels?.length || 0;
  const numLeaves = levels?.[0]?.length || 1;

  // Total canvas width based on maximum leaves
  const minCanvasWidth = Math.max(760, numLeaves * 110 + 60);
  const canvasHeight = Math.max(340, numLevels * levelGapY + 80);

  // Calculate Node Coordinates
  const { nodeCoords, links } = useMemo(() => {
    const coords: NodeCoord[] = [];
    const treeLinks: TreeLink[] = [];

    if (!levels || levels.length === 0) {
      return { nodeCoords: coords, links: treeLinks };
    }

    const coordMap = new Map<string, NodeCoord>();

    // Root is at top (y = 50), leaves at bottom
    levels.forEach((lvlNodes, lvlIndex) => {
      // lvlIndex: 0 is leaves, numLevels - 1 is root
      const y = canvasHeight - 50 - lvlIndex * levelGapY;
      const count = lvlNodes.length;
      const stepX = minCanvasWidth / (count + 1);

      lvlNodes.forEach((hash, idx) => {
        const x = stepX * (idx + 1);
        const isPromoted = lvlIndex > 0 && idx === count - 1 && levels[lvlIndex - 1].length % 2 === 1;

        const nodeCoord: NodeCoord = {
          level: lvlIndex,
          index: idx,
          hash,
          x,
          y,
          isPromoted,
        };

        coords.push(nodeCoord);
        coordMap.set(`${lvlIndex}-${idx}`, nodeCoord);
      });
    });

    // Build connections from children to parents
    for (let lvl = 0; lvl < levels.length - 1; lvl++) {
      const curLvl = levels[lvl];
      for (let i = 0; i < curLvl.length; i++) {
        const childCoord = coordMap.get(`${lvl}-${i}`);
        const parentIdx = Math.floor(i / 2);
        const parentCoord = coordMap.get(`${lvl + 1}-${parentIdx}`);

        if (childCoord && parentCoord) {
          const isPromotedChild = i === curLvl.length - 1 && curLvl.length % 2 === 1;
          const isActive =
            ancestorKeys.has(`${lvl}-${i}`) && ancestorKeys.has(`${lvl + 1}-${parentIdx}`);

          treeLinks.push({
            from: childCoord,
            to: parentCoord,
            isPromoted: isPromotedChild,
            isActive,
          });
        }
      }
    }

    return { nodeCoords: coords, links: treeLinks };
  }, [levels, numLevels, minCanvasWidth, canvasHeight, levelGapY, ancestorKeys]);

  const handleNodeClick = (lvlIndex: number, nodeIndex: number, hash: string) => {
    if (lvlIndex === 0) {
      setInternalSelectedIndex(nodeIndex);
      onSelectLeaf?.(nodeIndex, hash);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (!levels || levels.length === 0) {
    return (
      <div className="w-full p-8 text-center text-slate font-mono text-xs border border-deep rounded-2xl bg-ink/40">
        No Merkle tree levels available.
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col xl:flex-row gap-6 ${className}`}>
      {/* SVG Merkle Tree Diagram Canvas */}
      <div className="flex-1 rounded-2xl border border-deep bg-ink-deep p-4 relative overflow-hidden flex flex-col shadow-2xl">
        {/* Top Diagram Controls & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-deep/60 px-2 font-mono text-xs">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-sky" />
            <span className="font-bold text-white tracking-wide">RFC 6962 Merkle Tree Visualization</span>
            <span className="text-[11px] text-slate font-medium">({numLeaves} Leaves · {numLevels} Levels)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cerulean border border-sky shadow-sm shadow-sky/40" />
              <span className="text-silver">Ancestor Path</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-ink border-2 border-sky" />
              <span className="text-sky font-semibold">Sibling Hash</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 border-t border-dashed border-slate" />
              <span className="text-slate">Promoted Odd Node</span>
            </div>
          </div>
        </div>

        {/* Scrollable SVG Viewport */}
        <div className="w-full overflow-x-auto py-2">
          <svg
            viewBox={`0 0 ${minCanvasWidth} ${canvasHeight}`}
            className="w-full min-w-[720px] select-none"
            style={{ height: `${canvasHeight}px` }}
          >
            <defs>
              <linearGradient id="activeLinkGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#007EA7" />
                <stop offset="100%" stopColor="#00A8E8" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Tree Branch Links */}
            {links.map((link, i) => {
              const x1 = link.from.x;
              const y1 = link.from.y - nodeHeight / 2;
              const x2 = link.to.x;
              const y2 = link.to.y + nodeHeight / 2;

              // Smooth cubic bezier curve
              const cy1 = y1 - (levelGapY - nodeHeight) / 2;
              const cy2 = y2 + (levelGapY - nodeHeight) / 2;
              const pathData = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;

              return (
                <g key={`link-${i}`}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke={link.isActive ? 'url(#activeLinkGrad)' : link.isPromoted ? '#66747A' : '#003459'}
                    strokeWidth={link.isActive ? 2.5 : 1.5}
                    strokeDasharray={link.isPromoted ? '4,4' : undefined}
                    filter={link.isActive ? 'url(#glow)' : undefined}
                    className="transition-all duration-200"
                  />
                  {link.isPromoted && (
                    <text
                      x={(x1 + x2) / 2 + 8}
                      y={(y1 + y2) / 2}
                      fill="#66747A"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                      className="italic select-none"
                    >
                      promoted
                    </text>
                  )}
                </g>
              );
            })}

            {/* Tree Nodes */}
            {nodeCoords.map((node) => {
              const nodeKey = `${node.level}-${node.index}`;
              const isSelected = node.level === 0 && node.index === selectedIndex;
              const isAncestor = ancestorKeys.has(nodeKey);
              const isSibling = siblingKeys.has(nodeKey);
              const isRoot = node.level === numLevels - 1;
              const isLeaf = node.level === 0;

              // Node Styling
              let fillBg = '#000B0F';
              let strokeBorder = '#003459';
              let textColor = '#D4DEE2';
              let strokeWidth = 1.2;

              if (isAncestor) {
                fillBg = '#007EA7';
                strokeBorder = '#00A8E8';
                textColor = '#FFFFFF';
                strokeWidth = 2;
              } else if (isSibling) {
                fillBg = '#00171F';
                strokeBorder = '#00A8E8';
                textColor = '#00A8E8';
                strokeWidth = 2.5;
              } else if (isRoot) {
                strokeBorder = '#007EA7';
                textColor = '#00A8E8';
              }

              const shortHex = node.hash ? node.hash.slice(0, 6) : '000000';
              const label = isRoot
                ? 'Root'
                : isLeaf
                ? `L${node.index}`
                : `N${node.level}.${node.index}`;

              return (
                <g
                  key={nodeKey}
                  transform={`translate(${node.x - nodeWidth / 2}, ${node.y - nodeHeight / 2})`}
                  className={isLeaf ? 'cursor-pointer group' : ''}
                  onClick={() => handleNodeClick(node.level, node.index, node.hash)}
                >
                  <title>{`Level ${node.level}, Index ${node.index}\nHash: ${node.hash}`}</title>

                  {/* Rect Card */}
                  <rect
                    width={nodeWidth}
                    height={nodeHeight}
                    rx="8"
                    ry="8"
                    fill={fillBg}
                    stroke={strokeBorder}
                    strokeWidth={strokeWidth}
                    filter={isAncestor || isSibling ? 'url(#glow)' : undefined}
                    className="transition-all duration-150 group-hover:brightness-125"
                  />

                  {/* Node Label (L0, Root, etc) */}
                  <text
                    x="10"
                    y={nodeHeight / 2 + 4}
                    fill={isAncestor ? '#D4DEE2' : '#66747A'}
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {label}
                  </text>

                  {/* Monospace 6-hex Hash */}
                  <text
                    x={nodeWidth - 10}
                    y={nodeHeight / 2 + 4}
                    textAnchor="end"
                    fill={textColor}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {shortHex}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom instruction hint */}
        <div className="pt-2 border-t border-deep/40 text-[11px] text-slate font-mono flex items-center justify-between">
          <span>Click any leaf (L0..L{numLeaves - 1}) to trace its cryptographic folding path to root.</span>
          <span className="text-sky font-semibold">Active: Leaf #{selectedIndex ?? 0}</span>
        </div>
      </div>

      {/* Side Drawer: Step-by-Step Merkle Fold Inspector */}
      <div className="w-full xl:w-96 rounded-2xl border border-deep bg-ink/80 p-5 space-y-4 shadow-xl flex flex-col font-mono text-xs">
        <div className="flex items-center justify-between border-b border-deep/60 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky" />
            <h3 className="font-bold text-white text-sm">Merkle Path Folds</h3>
          </div>
          <span className="px-2 py-0.5 rounded bg-cerulean/20 text-sky text-[11px] font-bold">
            {foldSteps.length} Step{foldSteps.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Selected Leaf Overview */}
        <div className="p-3 rounded-xl bg-ink-deep border border-deep/80 space-y-1.5">
          <div className="flex items-center justify-between text-slate text-[11px]">
            <span>SELECTED RECORD LEAF</span>
            <span className="font-bold text-sky">Index #{selectedIndex ?? 0}</span>
          </div>
          <div className="text-white font-mono text-[11px] break-all">
            {levels[0]?.[selectedIndex ?? 0] || '—'}
          </div>
        </div>

        {/* Step List */}
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1">
          {foldSteps.map((step) => (
            <div
              key={step.step}
              className="p-3.5 rounded-xl border border-deep bg-deep/20 space-y-2 hover:border-sky/50 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-sky">
                  Fold #{step.step} · {step.isPromoted ? 'Odd Node Promotion' : `Sibling ${step.side}`}
                </span>
                <span className="text-slate text-[10px]">
                  {step.isPromoted ? 'RFC 6962 Promoted' : step.side === 'L' ? '0x01 || Sib || Cur' : '0x01 || Cur || Sib'}
                </span>
              </div>

              {!step.isPromoted && step.siblingHash ? (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate">Sibling Hash ({step.side === 'L' ? 'Left' : 'Right'}):</div>
                  <div className="p-1.5 rounded bg-ink-deep border border-deep/60 text-[10px] text-sky truncate flex items-center justify-between">
                    <span className="truncate">{step.siblingHash}</span>
                    <button
                      onClick={() => copyHash(step.siblingHash!)}
                      className="p-0.5 hover:text-white ml-1 text-slate flex-shrink-0"
                    >
                      {copiedHash === step.siblingHash ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] italic text-slate p-1.5 rounded bg-ink-deep border border-deep/60">
                  Node promoted directly without folding sibling.
                </div>
              )}

              {/* Resulting Parent */}
              <div className="space-y-1 pt-1">
                <div className="text-[10px] text-slate">Computed Parent Node:</div>
                <div className="p-1.5 rounded bg-ink-deep border border-cerulean/30 text-[10px] text-emerald-400 truncate flex items-center justify-between">
                  <span className="truncate">{step.parentHash}</span>
                  <button
                    onClick={() => copyHash(step.parentHash)}
                    className="p-0.5 hover:text-white ml-1 text-slate flex-shrink-0"
                  >
                    {copiedHash === step.parentHash ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Merkle Root Match */}
        <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-emerald-300 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Path Successfully Reaches Root</span>
          </div>
          <div className="text-[10px] text-emerald-300/80 truncate">
            {levels[levels.length - 1]?.[0] || '—'}
          </div>
        </div>
      </div>
    </div>
  );
};
