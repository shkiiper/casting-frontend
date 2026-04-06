export const CIS_POPULAR_CITIES = [
  "Бишкек",
  "Ош",
  "Алматы",
  "Астана",
  "Шымкент",
  "Караганда",
  "Ташкент",
  "Самарканд",
  "Бухара",
  "Андижан",
  "Душанбе",
  "Худжанд",
  "Минск",
  "Гомель",
  "Брест",
  "Москва",
  "Санкт-Петербург",
  "Казань",
  "Екатеринбург",
  "Новосибирск",
  "Краснодар",
  "Ростов-на-Дону",
  "Сочи",
  "Армавир",
  "Ереван",
  "Гюмри",
  "Баку",
  "Гянджа",
  "Тбилиси",
  "Батуми",
  "Кишинев",
  "Тирасполь",
] as const;

const CITY_SPLIT_REGEX = /[,;\n]+/;

export const parseCitiesValue = (value?: string | null) =>
  Array.from(
    new Set(
      String(value ?? "")
        .split(CITY_SPLIT_REGEX)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );

export const stringifyCitiesValue = (values: string[]) =>
  Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).join(", ");

export const getCityOptions = (selectedValues: string[]) => {
  const known = new Set(CIS_POPULAR_CITIES);
  const extras = selectedValues.filter((value) => !known.has(value as (typeof CIS_POPULAR_CITIES)[number]));
  return [...CIS_POPULAR_CITIES, ...extras];
};
