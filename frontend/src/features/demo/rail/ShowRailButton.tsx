/* The way back for a hidden demo steps rail, shown on the demo guide: the rail itself is gone, so the guide (always one
   click away in the navigation) is where the presenter brings it back. The guide renders it only while the rail is hidden. */
import { Button, Icon } from '../../../shared/ui';
import { useRailHidden } from './useRailHidden';

/** Render "Show demo steps on every page". */
export function ShowRailButton(): JSX.Element {
  const [, setHidden] = useRailHidden();
  return (
    <Button iconStart={<Icon name="eye" size={16} />} onClick={() => setHidden(false)} size="sm" variant="secondary">
      Show demo steps on every page
    </Button>
  );
}
