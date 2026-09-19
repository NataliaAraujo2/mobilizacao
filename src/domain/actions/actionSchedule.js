export function formatActionDate(value) {
  const [year, month, day] = String(value ?? '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : 'Não informada';
}

export function actionScheduleSummary(action) {
  const startDate = action.startDate ?? action.date;
  const endDate = action.endDate ?? startDate;
  const date = startDate === endDate ? formatActionDate(startDate) : `${formatActionDate(startDate)} a ${formatActionDate(endDate)}`;
  const time = action.startTime || action.endTime ? `${action.startTime || '—'} às ${action.endTime || '—'}` : '';
  return [date, time, action.scheduleText].filter(Boolean).join(' · ');
}

function actionMoment(date, time, fallbackTime) {
  const value = new Date(`${date}T${time || fallbackTime}:00-03:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function actionStatus(action, now = new Date()) {
  const startDate = action.startDate ?? action.date;
  const endDate = action.endDate ?? startDate;
  const start = actionMoment(startDate, action.startTime, '00:00');
  const end = actionMoment(endDate, action.endTime, '23:59');
  if (!start || !end) return 'planning';
  if (now < start) return 'planning';
  if (now <= end) return 'ongoing';
  return 'completed';
}

export function actionStatusLabel(action, now) {
  return { planning: 'Em planejamento', ongoing: 'Em andamento', completed: 'Concluída' }[actionStatus(action, now)];
}
