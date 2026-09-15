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
