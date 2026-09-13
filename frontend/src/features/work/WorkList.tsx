/* A list of My work cards, each followed by the pieces split off it, indented under a guide line. Recursive, because a
   piece's owner can split it again at any depth (plan2, "Depth is unlimited"). */
import type { WorkNode } from './nestWorkPieces';
import { WorkItemCard } from './WorkItemCard';

/** Render the cards and their nested pieces. */
export function WorkList({ nodes }: { nodes: WorkNode[] }): JSX.Element {
  return (
    <ul className="my-work__list">
      {nodes.map((node) => (
        <li key={node.item.task_id}>
          <WorkItemCard item={node.item} />
          {node.pieces.length > 0 ? (
            <div className="my-work__pieces">
              <p className="my-work__pieces-label">
                {node.pieces.length === 1 ? '1 piece' : `${node.pieces.length} pieces`} split off {node.item.title ?? 'this task'}
              </p>
              <WorkList nodes={node.pieces} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
