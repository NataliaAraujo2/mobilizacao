import { useEffect, useState } from "react";
import { actionStatusLabel } from "../domain/actions/actionSchedule";

export default function ActionStatus({ action }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return actionStatusLabel(action, now);
}
