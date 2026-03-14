import { useEffect, useState } from "react";
import { getSubscriptionInfo } from "./api/customer";
import type { SubscriptionInfoResponse } from "./types/customer";


export function SubscriptionPage() {
  const [info, setInfo] = useState<SubscriptionInfoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubscriptionInfo()
      .then(setInfo)
      .catch((e) => {
        console.error(e);
        setError("Ошибка загрузки подписки");
      });
  }, []);

  if (error) return <div>{error}</div>;
  if (!info) return <div>Загрузка...</div>;

  const usedContacts = info.totalLimit - info.remainingContacts;

  return (
    <div>
      <h1>Моя подписка</h1>
      <p>План: {info.planName}</p>
      <p>Лимит контактов: {info.totalLimit}</p>
      <p>Использовано: {usedContacts}</p>
      <p>Осталось: {info.remainingContacts}</p>
    </div>
  );
}
