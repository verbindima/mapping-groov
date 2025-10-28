  if (!data || !Array.isArray(data.customerCards)) {
    throw new Error('Ожидался объект с полем customerCards: []');
  }

  const byteLen = (obj) => {
    const s = JSON.stringify(obj);
    if (typeof Buffer !== 'undefined' && Buffer.byteLength) {
      return Buffer.byteLength(s, 'utf8');         // Node
    }
    return new TextEncoder().encode(s).length;      // Браузер
  };

  // База: все поля как есть, но customerCards пустой.
  const base = { ...data, customerCards: [] };

  // Санити-чек: пустой каркас должен влезать.
  if (byteLen(base) > maxBytes) {
    throw new Error('Даже пустой объект с customerCards:[] превышает лимит. Уберите лишние поля.');
  }

  const chunks = [];
  let current = [];

  for (const card of data.customerCards) {
    // Если одна карта не лезет сама по себе — дальше смысла нет.
    const single = { ...base, customerCards: [card] };
    if (byteLen(single) > maxBytes) {
      throw new Error('Одна customerCard больше лимита. Без резки её внутренних массивов это не упаковать.');
    }

    const candidate = { ...base, customerCards: current.concat(card) };
    if (byteLen(candidate) <= maxBytes) {
      current.push(card);
    } else {
      // Сбрасываем накопленное и начинаем новый чанк
      if (current.length) chunks.push({ ...base, customerCards: current });
      current = [card];
    }
  }

  if (current.length) {
    chunks.push({ ...base, customerCards: current });
  }

  return chunks; // Массив объектов той же структуры: [{ ...прочие поля, customerCards:[...] }, ...]
}

/* Пример:
const parts = splitBySize(sourceObject, 1_000_000);
// parts — это [{customerCards:[...], ...прочие поля}, ...]
// Отправляете каждый: JSON.stringify(parts[i])
*/
function splitCustomerCards(data, parts = 5) {
  if (!data || !Array.isArray(data.customerCards)) {
    throw new Error('Нужен объект формата { customerCards: [...] }');
  }
  const total = data.customerCards.length;
  const base = Math.floor(total / parts);
  const extra = total % parts;

  const res = {};
  let offset = 0;

  for (let i = 1; i <= parts; i++) {
    const size = base + (i <= extra ? 1 : 0);
    res[i] = { customerCards: data.customerCards.slice(offset, offset + size) };
    offset += size;
  }
  return res;
}

// Поля в точном порядке, как во втором скрине
const FIELDS = [
  "id",
  "additionalInfo",
  "phoneType",
  "countryCode",
  "cityCode",
  "phoneNumber",
  "phoneExtension",
  "addressRegion",
  "addressRayon",
  "addressCity",
  "addressSettlement"
];

/**
 * Преобразует массив объектов (как на 1-м скрине)
 * в тело запроса (как на 2-м скрине).
 * @param {Array<Object>} rows
 * @returns {Object} doBatchCleanRequest payload
 */
function toBatchCleanRequest(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Ожидался массив объектов с телефонами");
  }

  return {
    doBatchCleanRequest: {
      mapping: "clean-phone",
      data: rows.map(row => ({
        datafields: FIELDS.map(key => {
          const v = row?.[key];
          return v == null ? "" : String(v);
        })
      }))
    }
  };
}

// ===== Пример использования =====

// Вход как на первом скрине (можно подставить свои данные)
const input = [
  {
    id: "1",
    additionalInfo: "-БРАТ СЕРГЕЙ",
    phoneType: "0",
    countryCode: "OTHER",
    cityCode: "495",
    phoneNumber: "3808230",
    phoneExtension: "5516",
    addressRegion: "",
    addressRayon: "Москва",
    addressCity: "",
    addressSettlement: ""
  },
  {
    id: "2",
    additionalInfo: "В/Ч",
    phoneType: "RELATIVE",
    countryCode: "7",
    cityCode: "495",
    phoneNumber: "1050055",
    phoneExtension: "1568",
    addressRegion: "",
    addressRayon: "Москва",
    addressCity: "Люберцы",
    addressSettlement: ""
  },
  {
    id: "3",
    additionalInfo: "TATOSHKA",
    phoneType: "WORK",
    countryCode: "7",
    cityCode: "38361",
    phoneNumber: "23829",
    phoneExtension: "8261",
    addressRegion: "Барабинский",
    addressRayon: "Новосибирская область",
    addressCity: "Барабинск",
    addressSettlement: "Барабинск"
  }
];

// Результат как на втором скрине
const payload = toBatchCleanRequest(input);
// console.log(JSON.stringify(payload, null, 2));
