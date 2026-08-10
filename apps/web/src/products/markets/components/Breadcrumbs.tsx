import { Link } from "react-router-dom";

import { discoverPath, eventPath } from "../routes/paths";

interface BreadcrumbsProps {
  eventId?: string;
  eventTitle?: string;
  marketQuestion?: string;
}

export function Breadcrumbs({ eventId, eventTitle, marketQuestion }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to={discoverPath()} className="hover:text-foreground hover:underline">
            Discover
          </Link>
        </li>
        {eventId ? (
          <>
            <li aria-hidden="true">/</li>
            <li>
              {marketQuestion ? (
                <Link to={eventPath(eventId)} className="hover:text-foreground hover:underline">
                  {eventTitle ?? "Event"}
                </Link>
              ) : (
                <span className="text-foreground">{eventTitle ?? "Event"}</span>
              )}
            </li>
          </>
        ) : null}
        {marketQuestion ? (
          <>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{marketQuestion}</li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}
