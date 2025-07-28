interface ICalendarEvent {
  summary: string;
  description: string;
  startTime: Date;
  durationMinutes: number;
}

function formatDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateICS(event: ICalendarEvent): string {
  const endTime = new Date(event.startTime.getTime() + event.durationMinutes * 60000);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BroLab//Reservation System//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(endTime)}`,
    `SUMMARY:${event.summary}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    'LOCATION:BroLab Studio',
    `UID:${crypto.randomUUID()}@brolab.fr`,
    'SEQUENCE:0',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    `DTSTAMP:${formatDate(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}