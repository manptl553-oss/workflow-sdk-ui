import { memo, useCallback, useState, JSX } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  useReactFlow,
  useStore,
} from 'reactflow';
import { cn, formatName, getEdgeLabel, NodeTypeProps } from '@/shared';
import { useFlowStore } from '@/store';
import { Plus, Unlink } from 'lucide-react';

/* -------------------------------------------------------------------
   CONSTANTS
------------------------------------------------------------------- */
const DOT_SPACING = 18;
const DOT_RADIUS = 4;
const NODE_DEFAULT_WIDTH = 100;
const EDGE_CAP_RADIUS = 13;
const HIT_STROKE_WIDTH = 30;

/* -------------------------------------------------------------------
   UTIL — Color Interpolation
------------------------------------------------------------------- */
const lerpColor = (c1: string, c2: string, t: number) => {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);

  return `rgb(
    ${((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t},
    ${((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t},
    ${(a & 255) * (1 - t) + (b & 255) * t}
  )`;
};

/* -------------------------------------------------------------------
   HELPER: Dots
------------------------------------------------------------------- */
const renderPolylineDots = (points: { x: number; y: number }[], color1: string, color2: string) => {
  if (points.length < 2) return [];

  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(len);
    totalLength += len;
  }

  const dots: JSX.Element[] = [];
  let currentDist = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const segLen = segmentLengths[i];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const count = Math.floor(segLen / DOT_SPACING);

    for (let j = 0; j <= count; j++) {
      const segT = j / count; 
      const x = p1.x + dx * segT;
      const y = p1.y + dy * segT;

      const distCovered = currentDist + (segLen * segT);
      const globalT = Math.min(1, Math.max(0, distCovered / totalLength));

      dots.push(
        <circle
          key={`poly-dot-${i}-${j}`}
          cx={x}
          cy={y}
          r={DOT_RADIUS}
          fill={lerpColor(color1, color2, globalT)}
        />
      );
    }
    currentDist += segLen;
  }
  return dots;
};

/* -------------------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------------------- */
const CustomEdge = memo((props: EdgeProps) => {
  const { id, source, target, sourceX, sourceY, targetX, targetY } = props;
  const [hovered, setHovered] = useState(false);
  const { getNode } = useReactFlow();
  const nodeInternals = useStore((s) => s.nodeInternals);

  const { deleteEdge, addNodeBetweenEdge, nodeTypeMeta } = useFlowStore();
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  const getNodeMetrics = (nodeId: string) => {
    const n = nodeInternals.get(nodeId);
    if (!n) return null;
    const { positionAbsolute = { x: 0, y: 0 } } = n;
    const trueRadius = NODE_DEFAULT_WIDTH / 2;
    return {
      cx: positionAbsolute.x + NODE_DEFAULT_WIDTH / 2 + 10,
      cy: positionAbsolute.y + NODE_DEFAULT_WIDTH / 2 - 6,
      r: trueRadius,
      pos: positionAbsolute,
      w: n.width ?? NODE_DEFAULT_WIDTH,
      h: n.height ?? 40
    };
  };

  const srcMetrics = getNodeMetrics(source);
  const tgtMetrics = getNodeMetrics(target);

  if (!srcMetrics || !tgtMetrics) return null;

  const label = getEdgeLabel(props?.sourceHandleId ?? undefined);

  const sourceColor =
    nodeTypeMeta.get(sourceNode?.data?.type as NodeTypeProps)?.color ?? '#3b82f6';

  const targetColor =
    nodeTypeMeta.get(targetNode?.data?.type as NodeTypeProps)?.color ?? '#6B7280';

  /* ---------------------------------------------------------------------------------
     LOGIC FLAGS - UPDATED
     We add "source === target" to isSelfLoop.
     This ensures that if the IDs are the same, it ALWAYS renders as a self loop,
     even if the 'loopType' data property hasn't updated yet.
  --------------------------------------------------------------------------------- */
  const isSelfLoop = props.source === props.target || props?.data?.loopType === 'self';
  const isLoopChild = props?.data?.loopType === 'loop-child'; 
  const isLoopBack = props?.data?.loopType === 'loop-back'; 

  const handleAddNodeBetween = () => {
    let position = { x: 0, y: 0 };
    if (isSelfLoop || isLoopBack) {
       position = {
        x: (srcMetrics.pos.x) + 260,
        y: srcMetrics.pos.y,
      };
    } else {
      position = {
        x: (props.sourceX + props.targetX) / 2 - 20,
        y: (props.sourceY + props.targetY) / 2 - 20,
      };
    }

    addNodeBetweenEdge(position, {
      ...props,
      sourceHandle: props.sourceHandleId,
      targetHandle: props.targetHandleId,
    });
  };

  const handleUnlinkNodes = () => {
    deleteEdge(props.id);
  };

  const renderEdgeActions = (x: number, y: number, angleDeg: number) => {
    const offset = 20;
    const rad = (angleDeg * Math.PI) / 180;
    const offsetX = Math.sin(rad) * offset;
    const offsetY = -Math.cos(rad) * offset;
    return (
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(${x - offsetX}px, ${y - offsetY}px) translate(-50%, -50%) rotate(${angleDeg}deg)`,
            pointerEvents: 'none',
            zIndex: 1001,
          }}
          className="absolute nodrag nopan"
        >
          <div
            className={cn(
              'wf-edge-actions',
              hovered ? 'wf-edge-actions--visible' : 'wf-edge-actions--hidden',
            )}
            style={{ pointerEvents: 'all' }}
            onMouseEnter={() => setHovered(true)} 
          >
            <button onClick={handleAddNodeBetween} className="wf-edge-btn wf-btn-green">
              <Plus className="wf-edge-icon" />
            </button>
            <button onClick={handleUnlinkNodes} className="wf-edge-btn wf-btn-red">
              <Unlink className="wf-edge-icon" />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    );
  };

  const renderEdgeLabel = useCallback(
    (x: number, y: number, angleDeg: number, text: string) => {
      const offset = 20;
      const rad = (angleDeg * Math.PI) / 180;
      const offsetX = Math.sin(rad) * offset;
      const offsetY = -Math.cos(rad) * offset;

      return (
        <EdgeLabelRenderer>
          <div
            className="wf-edge-label-wrapper"
            style={{
              transform: `translate(${x + offsetX}px, ${y + offsetY}px) translate(-50%, -50%) rotate(${angleDeg}deg)`,
              pointerEvents: 'none'
            }}
          >
            <span className="wf-edge-label">{text}</span>
          </div>
        </EdgeLabelRenderer>
      );
    },
    [],
  );

  const filterId = `shadow-${id}`;
  const ShadowDef = (
    <defs>
      <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
        <feOffset dx="0" dy="4" result="off" />
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.20" />
      </filter>
    </defs>
  );

  /* =====================================================================================
     1) SELF LOOP
  ===================================================================================== */
  if (isSelfLoop) {
    const pos = srcMetrics.pos;
    const width = srcMetrics.w;
    const height = srcMetrics.h;

    const left = pos.x - 80;
    const right = pos.x + width + 80;
    const bottom = pos.y + height + 60;
    const startY = pos.y + height / 2;

    const points = [
      { x: pos.x + width, y: startY },
      { x: right, y: startY },
      { x: right, y: bottom },
      { x: left, y: bottom },
      { x: left, y: startY },
      { x: pos.x, y: startY }
    ];

    const hitPath = `
      M ${points[0].x} ${points[0].y}
      L ${points[1].x} ${points[1].y}
      L ${points[2].x} ${points[2].y}
      L ${points[3].x} ${points[3].y}
      L ${points[4].x} ${points[4].y}
      L ${points[5].x} ${points[5].y}
    `;

    return (
      <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {ShadowDef}
        <path d={hitPath} stroke="transparent" strokeWidth={HIT_STROKE_WIDTH} fill="none" />
        {renderPolylineDots(points, sourceColor, sourceColor)}
        {renderEdgeActions((left + right) / 2, bottom, 0)}
      </g>
    );
  }

  /* =====================================================================================
     2) LOOP BACK (Fixed - No Weird Dots)
  ===================================================================================== */
  if (isLoopBack) {
    const loop = tgtMetrics;
    const child = srcMetrics;

    const left = loop.pos.x - 120;
    const right = child.pos.x + child.w + 120;
    const bottom = Math.max(child.pos.y + child.h, loop.pos.y + loop.h) + 60;
    
    const endY = loop.pos.y + loop.h / 2;
    const startY = child.pos.y + child.h / 2;

    const polyPoints = [
      { x: child.pos.x + child.w, y: startY },
      { x: right, y: startY },
      { x: right, y: bottom },
      { x: left, y: bottom },
      { x: left, y: endY },
      { x: loop.pos.x, y: endY }
    ];

    const hitPathStr = `
      M ${polyPoints[0].x} ${polyPoints[0].y}
      L ${polyPoints[1].x} ${polyPoints[1].y}
      L ${polyPoints[2].x} ${polyPoints[2].y}
      L ${polyPoints[3].x} ${polyPoints[3].y}
      L ${polyPoints[4].x} ${polyPoints[4].y}
      L ${polyPoints[5].x} ${polyPoints[5].y}
    `;

    return (
      <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {ShadowDef}
        <path d={hitPathStr} stroke="transparent" strokeWidth={HIT_STROKE_WIDTH} fill="none" />
        {renderPolylineDots(polyPoints, sourceColor, targetColor)}
        {renderEdgeActions((left + right) / 2, bottom, 0)}
      </g>
    );
  }

  /* =====================================================================================
     3) NORMAL EDGES
  ===================================================================================== */
  const [hitPath] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY, borderRadius: 30,
  });

  const angleRad = Math.atan2(tgtMetrics.cy - srcMetrics.cy, tgtMetrics.cx - srcMetrics.cx);

  const startX = srcMetrics.cx + Math.cos(angleRad) * srcMetrics.r;
  const startY = srcMetrics.cy + Math.sin(angleRad) * srcMetrics.r + 5;
  const endX = tgtMetrics.cx + Math.cos(angleRad + Math.PI) * tgtMetrics.r;
  const endY = tgtMetrics.cy + Math.sin(angleRad + Math.PI) * tgtMetrics.r + 5;
  const dx = endX - startX;
  const dy = endY - startY;
  const lineLen = Math.sqrt(dx * dx + dy * dy);
  const count = Math.floor(lineLen / DOT_SPACING);

  const dots = [];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    dots.push(
      <circle
        key={`dot-${i}`}
        cx={startX + dx * t}
        cy={startY + dy * t}
        r={DOT_RADIUS}
        fill={lerpColor(sourceColor, targetColor, t)}
      />,
    );
  }

  const labelX = startX + dx * 0.5;
  const labelY = startY + dy * 0.5;
  const labelAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normalizedAngle = (labelAngle + 360) % 360;
  const displayAngle = normalizedAngle > 90 && normalizedAngle < 270 ? normalizedAngle + 180 : normalizedAngle;

  return (
    <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {ShadowDef}
      <BaseEdge id={id} path={hitPath} style={{ stroke: 'transparent', strokeWidth: HIT_STROKE_WIDTH }} />
      {dots}

      <g className="sourceCap" // @ts-ignore
         cx={srcMetrics.cx} cy={srcMetrics.cy} r={srcMetrics.r} fill={sourceColor} opacity={0.5} filter={`url(#${filterId})`} rotate={angleRad}
      >
        <circle className="sourceCapBoundary" cx={srcMetrics.cx + Math.cos(angleRad) * srcMetrics.r} cy={srcMetrics.cy + Math.sin(angleRad) * srcMetrics.r} r={EDGE_CAP_RADIUS} fill={sourceColor} stroke="white" strokeWidth={3} />
      </g>

      <g className="targetCap" // @ts-ignore
         cx={tgtMetrics.cx} cy={tgtMetrics.cy} r={tgtMetrics.r} fill={targetColor} opacity={0.5} filter={`url(#${filterId})`} rotate={angleRad}
      >
        <circle className="targetCapBoundary" cx={tgtMetrics.cx + Math.cos(angleRad + Math.PI) * tgtMetrics.r} cy={tgtMetrics.cy + Math.sin(angleRad + Math.PI) * tgtMetrics.r} r={EDGE_CAP_RADIUS} fill={targetColor} stroke="white" strokeWidth={3} />
      </g>

      {label && renderEdgeLabel(labelX, labelY, displayAngle, formatName(label))}
      {renderEdgeActions(labelX, labelY, displayAngle)}
    </g>
  );
});

export default CustomEdge;