/* The task's requirements as its participant sees them: each with its tags, hours and their status, and, for a
   requirement the viewer split off, the piece it went to. Constraints follow, marked when they flowed down from the task
   this one was split from. Tags and hours marked "draft" are estimates until the owner confirms them (plan2). */
import { Link } from 'react-router-dom';

import { Badge, Card, Stack, Table } from '../../../shared/ui';
import { constraintLabel } from '../../marketplace/detail/tabs/constraintLabel';
import type { TaskDetail } from '../types';
import './TaskRequirements.css';

interface TaskRequirementsProps {
  task: TaskDetail;
}

/** Render the requirement table and the constraint list. */
export function TaskRequirements({ task }: TaskRequirementsProps): JSX.Element {
  const withTask = task.requirements.filter((row) => row.piece === null).length;

  return (
    <Stack gap={5}>
      <Card
        description={`Scope v${task.scope_version_number ?? '—'}${task.origin === 'rebid' || task.relationship !== 'owner' ? '' : ' (the version your accepted offer answered)'} · ${withTask} of ${task.requirements.length} still with this task`}
        padding="none"
        title="Requirements"
      >
        <Table density="compact" label="Requirements" layout="stack" minWidth="720px">
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Labor category · PSC · NAICS</th>
              <th className="ui-num">Hours</th>
              <th>Where it is</th>
            </tr>
          </thead>
          <tbody>
            {task.requirements.map((row) => (
              <tr key={row.key}>
                <td data-label="Requirement">
                  <span className="task-requirements__text">{row.text}</span>
                  {row.priority === 'should' ? <Badge tone="neutral">Nice to have</Badge> : null}
                </td>
                <td data-label="Tags">
                  <span className="task-requirements__tags">
                    {[row.labor_category ?? 'No labor category', row.psc ?? 'no PSC', row.naics ?? 'no NAICS'].join(' · ')}
                  </span>
                  {row.tags_status === 'confirmed' ? null : <Badge tone="warning">Draft tags</Badge>}
                </td>
                <td className="ui-num" data-label="Hours">
                  {row.hours_estimate === null ? <span className="ui-text-muted">Unanswered</span> : row.hours_estimate.toLocaleString('en-US')}
                  {row.hours_status === 'draft' ? <> <Badge tone="warning">Estimate</Badge></> : null}
                </td>
                <td data-label="Where it is">
                  {row.piece ? (
                    <Link to={`/tasks/${row.piece.task_id}`}>In your piece: {row.piece.title ?? 'untitled'}</Link>
                  ) : (
                    <span className="ui-text-muted">With this task</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card title="Constraints bidders must meet">
        {task.constraints.length === 0 ? (
          <p className="ui-text-muted ui-text-sm">No constraints on this task.</p>
        ) : (
          <ul className="task-requirements__constraints">
            {task.constraints.map((constraint) => (
              <li key={`${constraint.kind}:${constraint.value}`}>
                <Badge size="md" tone="warning">{constraintLabel(constraint.kind)}</Badge> {constraint.value}
                {constraint.is_inherited ? <> <Badge tone="neutral">Flowed down</Badge></> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Stack>
  );
}
