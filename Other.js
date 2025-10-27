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
