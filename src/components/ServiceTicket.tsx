"use client";

import type { ReactNode } from "react";
import { formatTime, monthShort, weekdayShort, whenLabel } from "@/lib/format";
import type { ServiceItem } from "@/lib/types";
import { Avatar } from "./ui";

export function ServiceTicket({
  service,
  today,
  actions,
}: {
  service: ServiceItem;
  today: string;
  actions?: ReactNode;
}) {
  const past = service.serviceDate < today;
  const todayFlag = service.serviceDate === today;
  const photos = [
    service.preacherPhotoUrl ? { name: service.preacherName, src: service.preacherPhotoUrl } : null,
    ...service.singers.filter((person) => person.photoUrl).map((person) => ({ name: person.name, src: person.photoUrl })),
  ].filter(Boolean) as { name: string; src: string }[];
  return (
    <article className={`ticket ${past ? "past" : ""} ${todayFlag ? "today" : ""}`}>
      <div className="ticket-date">
        <span>{weekdayShort(service.serviceDate)}</span>
        <strong>{Number(service.serviceDate.slice(8, 10))}</strong>
        <span>{monthShort(service.serviceDate)}</span>
        <em>{formatTime(service.serviceTime)}</em>
      </div>
      <div className="ticket-body">
        <div className="history-top">
          <p className="kicker">{whenLabel(service.serviceDate, today)}</p>
          {todayFlag ? <span className="badge">Hoje</span> : null}
        </div>
        <h3>{service.title}</h3>
        {service.theme ? <p className="theme">{service.theme}</p> : null}
        <ul className="people-lines">
          <li><span>Dirige</span> {service.leaderName}</li>
          <li><span>Prega</span> {service.preacherName}</li>
          {service.singers.length ? <li><span>Louvor</span> {service.singers.map((person) => person.name).join(", ")}</li> : null}
          {service.intercessors.length ? <li><span>Intercede</span> {service.intercessors.map((person) => person.name).join(", ")}</li> : null}
        </ul>
        {photos.length ? (
          <div className="avatar-row">
            {photos.slice(0, 5).map((photo) => <Avatar key={`${photo.name}-${photo.src}`} name={photo.name} src={photo.src} size={36} />)}
          </div>
        ) : null}
        {actions ? <div className="ticket-actions no-print">{actions}</div> : null}
      </div>
    </article>
  );
}
