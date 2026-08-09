import { Navigate } from "react-router-dom";

/** Activity is integrated into Portfolio (Transactions tab). */
const Activity = () => <Navigate to="/app/portfolio?section=activity" replace />;

export default Activity;
