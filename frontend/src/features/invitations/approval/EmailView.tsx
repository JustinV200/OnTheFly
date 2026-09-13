/* Shows one email exactly as it will be (or was) sent: every header, then the plain-text body, unreformatted.
   The owner approves this text, so nothing here summarises, truncates, or prettifies it. */
import './EmailView.css';

interface EmailViewProps {
  headers: Record<string, string>;
  body: string;
}

/** Render the headers table and the verbatim body. */
export function EmailView({ headers, body }: EmailViewProps): JSX.Element {
  return (
    <div className="email-view">
      <dl className="email-view__headers">
        {Object.entries(headers).map(([name, value]) => (
          <div className="email-view__header" key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <pre className="email-view__body">{body}</pre>
    </div>
  );
}
