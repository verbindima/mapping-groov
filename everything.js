

// ==================== Справочники маппинга ====================

const ORG_FORM_MAP = {
  PBOYUL: '699626916',
  INDIVIDUAL: '1105141803',
  GKFH: '3595749703',
  UNKNOWN: null,
};

const GENDER_MAP = {
  MALE: 'М',
  FEMALE: 'Ж',
  UNKNOWN: null,
};

const DOC_TYPE_MAP = {
  ACT_OF_GUARDIANSHIP: '2595940603',
  ADOPTION_CERTIFICATE: '2595940603',
  ADVOCATE_CERT: '2595940603',
  APP_TEMP_ASYLUM: '2595940603',
  BIRTH_CERTIFICATE: '11500019',
  CERTIFICATE_OF_ASYLUM: '2595940603',
  COURT_DECISION_ADOPTION: '2595940603',
  DEATH_CERT: '11851487003',
  DIPLOMATIC_PASSPORT_FOREIGNER: '776097200',
  DIPLOMATIC_PASSPORT_RU: '37713416',
  DRIVING_LICENSE: '2622318203',
  DRIVING_LICENSE_FOREIGNER: '2720302403',
  FMS_CODE: '2595940603',
  FOREIGN_BIRTH_CERT: '2596461303',
  FOREIGN_STATELESS_ID: '4436405203',
  GUARD_CERT: '2595940603',
  GUARDIAN_ID: '2595940603',
  IDP_CERTIFICATE: '4436406003',
  INN_REGISTRATION: '2595940603',
  MIGRATION_CARD: '2634218603',
  MILITARY_CERTIFICATE: '2595940603',
  MILITARY_TICKET: '37713316',
  MILITARY_TICKET_OFFICER: '37713916',
  MISSED: '2595940603',
  OFFICE_PASSPORT_RU: '2595940603',
  OFFICER_CERTIFICATE: '11276519',
  OTHER_FOREIGNER_ID: '2595940603',
  OTHER_RESIDENCE_PERMIT: '2595940603',
  OTHER_STATELESS_ID: '2595940603',
  OTHER_RESIDENCE_PERMIT_2: '2595940603',
  OTHER_STATELESS_ID_2: '2595940603',
  OVERSEAS_PASSPORT_RU: '37713116',
  OVERSEAS_PASSPORT_USSR: '11416219',
  PASSPORT_FOREIGNER: '37713516',
  PASSPORT_MINMORFLOTA: '37713216',
  PASSPORT_RU: '30363316',
  PASSPORT_SAILOR: '37713816',
  PASSPORT_USSR: '11276419',
  PATENT: '2595940603',
  PENSION_CERTIFICATE: '749573400',
  PRISON_CERTIFICATE: '37713016',
  REFUGEE_CERTIFICATE: '37713716',
  REFUGEE_IMMIGRANTS_CERTIFICATE: '655990116',
  REFUGEE_STATELESS_CERTIFICATE: '2595940603',
  RESIDENCY: '37713616',
  TEMP_NATIONAL_CERTIFICATE: '2595940603',
  TEMP_REFUGE: '2595940603',
  TEMPORARY_CERTIFICATE: '655990216',
  TEMPORARY_MILITARY_TICKET: '2595940603',
  TEMPORARY_RESIDENCE: '2631771503',
  TEMPORARY_RESIDENCE_FOR_EDUCATION: '2595940603',
  TEMPORARY_STATELESS_CERTIFICATE: '2595940603',
  TRACTOR_DRIVING_LICENSE: '6134332303',
  TRUSTEE_CERTIFICATE: '2595940603',
  VETERAN_CERT: '2595940603',
  VISA: '2631765503',
  WORK_PERMIT: '2595940603',
};

const PHONE_TYPE_MAP = {
  HOME: 'CMHOME',
  MOBILE: 'CMMOB',
};

const ADDRESS_TYPE_MAP = {
  LEGAL: '470',
  HOME: '471',
  POSTAL: '472',
  CONSTANT_REGISTRATION: '11441319',
  LOCATION: '15522816',
  WORK: '15522816',
  OTHER: '44066816',
  SPOUSE: '44066816',
  REGISTRATION: '1166402903',
  SUPPORT_OFFICE: '2686637403',
  ENRICHED: null,
};

// ==================== Вспомогательные функции ====================

/**
 * Найти значение поля в массиве party.field[] по имени поля.
 */
function getField(partyFields, fieldName) {
  if (!Array.isArray(partyFields)) return undefined;
  const field = partyFields.find((f) => f[fieldName] !== undefined);
  return field ? field[fieldName] : undefined;
}

/**
 * Получить значение из вложенного объекта по пути вида "field[].someKey".
 */
function getFieldValue(partyFields, key) {
  if (!Array.isArray(partyFields)) return undefined;
  for (const field of partyFields) {
    if (field[key] !== undefined) return field[key];
  }
  return undefined;
}

/**
 * Убрать лишние пробелы и символы из строки.
 */
function cleanString(str) {
  if (!str) return str;
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Найти атрибут по типу в party.attribute[].
 */
function findAttributes(attributes, type) {
  if (!Array.isArray(attributes)) return [];
  return attributes.filter((attr) => attr.type === type);
}

/**
 * Получить значение поля из attribute.field[].
 */
function getAttrFieldValue(attribute, key) {
  if (!attribute || !Array.isArray(attribute.field)) return undefined;
  for (const f of attribute.field) {
    if (f[key] !== undefined) return f[key];
  }
  return undefined;
}

// ==================== Основная функция маппинга ====================

/**
 * Преобразует данные из MDM-структуры (party) в AIS-структуру.
 *
 * @param {object} party — объект MDM party
 * @param {string} isn — ISN, определённый из ответа MDM
 * @returns {object} — объект в формате AIS
 */
function mapMdmToAis(party, isn) {
  const fields = party.field || [];
  const attributes = party.attribute || [];

  // --- Базовые поля ---
  const result = {
    isn: isn,
    fullName: cleanString(getFieldValue(fields, 'fullNameRawSource')) || null,
    inn: getFieldValue(fields, 'inn') || null,
    orgFormId: ORG_FORM_MAP[getFieldValue(fields, 'ipMark')] ?? null,
    birthday: getFieldValue(fields, 'birthdate') || null,
    gender: GENDER_MAP[getFieldValue(fields, 'gender')] ?? null,
  };

  // --- Документ (первый DOCUMENT_PASSPORT или первый атрибут с документом) ---
  const docAttributes = findAttributes(attributes, 'DOCUMENT_PASSPORT');
  const docAttr = docAttributes.length > 0 ? docAttributes[0] : null;

  // qualifierType может быть в любом атрибуте
  const allDocAttrs = attributes.filter(
    (a) =>
      a.field &&
      a.field.some((f) => f.qualifierType !== undefined)
  );
  const docTypeSource = allDocAttrs.length > 0 ? allDocAttrs[0] : null;
  const qualifierType = docTypeSource
    ? getAttrFieldValue(docTypeSource, 'qualifierType')
    : null;

  result.docTypeId = qualifierType ? (DOC_TYPE_MAP[qualifierType] ?? null) : null;
  result.docSer = docTypeSource
    ? getAttrFieldValue(docTypeSource, 'documentSeries') || null
    : null;
  result.docNo = docTypeSource
    ? getAttrFieldValue(docTypeSource, 'documentNumber') || null
    : null;

  // Поля, привязанные к type == 'DOCUMENT_PASSPORT'
  result.docDate = docAttr
    ? getAttrFieldValue(docAttr, 'issueDate') || null
    : null;
  result.docIssuer = docAttr
    ? getAttrFieldValue(docAttr, 'issueAuthority') || null
    : null;
  result.docIssuedCode = docAttr
    ? getAttrFieldValue(docAttr, 'departmentCode') || null
    : null;
  result.docdateend = docAttr
    ? getAttrFieldValue(docAttr, 'expiryDate') || null
    : null;

  // --- Контакты ---
  result.contacts = [];

  // Email
  const emailAttrs = findAttributes(attributes, 'EMAIL');
  for (const emailAttr of emailAttrs) {
    const email = getAttrFieldValue(emailAttr, 'email');
    if (email) {
      result.contacts.push({
        type: 'CMEML',
        value: email,
      });
    }
  }

  // Телефоны
  const phoneAttrs = findAttributes(attributes, 'PHONE');
  for (const phoneAttr of phoneAttrs) {
    const phoneType = getAttrFieldValue(phoneAttr, 'type');
    const countryCode = getAttrFieldValue(phoneAttr, 'countryCode') || '';
    const phoneNumber = getAttrFieldValue(phoneAttr, 'number') || '';

    const mappedType = PHONE_TYPE_MAP[phoneType] || phoneType;
    const value = (countryCode + phoneNumber).trim();

    if (value) {
      result.contacts.push({
        type: mappedType,
        value: value,
      });
    }
  }

  // --- Адреса ---
  result.addresses = [];

  const addressAttrs = findAttributes(attributes, 'ADDRESS');
  for (const addrAttr of addressAttrs) {
    const addrFields = addrAttr.field || [];

    // Определяем тип адреса
    const addrType = getAttrFieldValue(addrAttr, 'type')
      || getAttrFieldValue(addrAttr, 'addressType');

    const typeIsn = addrType ? (ADDRESS_TYPE_MAP[addrType] ?? null) : null;

    // Пропускаем ENRICHED (null)
    if (typeIsn === null && addrType === 'ENRICHED') continue;

    const rawSource = getAttrFieldValue(addrAttr, 'rawSource');
    const addressFull = rawSource ? cleanString(rawSource) : null;

    result.addresses.push({
      typeIsn: typeIsn,
      addressFull: addressFull,
    });
  }

  return result;
}

// ==================== Пример использования ====================

const exampleMdmParty = {
  field: [
    { fullNameRawSource: '  Иванов   Иван   Иванович  ' },
    { inn: '123456789012' },
    { ipMark: 'INDIVIDUAL' },
    { birthdate: '1990-05-15' },
    { gender: 'MALE' },
  ],
  attribute: [
    {
      type: 'DOCUMENT_PASSPORT',
      field: [
        { qualifierType: 'PASSPORT_RU' },
        { documentSeries: '4510' },
        { documentNumber: '123456' },
        { issueDate: '2010-06-20' },
        { issueAuthority: 'ОВД РАЙОНА ТВЕРСКОЙ' },
        { departmentCode: '770-055' },
        { expiryDate: null },
      ],
    },
    {
      type: 'EMAIL',
      field: [{ email: 'ivanov@example.com' }],
    },
    {
      type: 'PHONE',
      field: [
        { type: 'MOBILE' },
        { countryCode: '+7' },
        { number: '9161234567' },
      ],
    },
    {
      type: 'ADDRESS',
      field: [
        { type: 'HOME' },
        { rawSource: '  РОССИЯ,  119501, г.Москва,  ул. Ленина, д.1  ' },
      ],
    },
  ],
};

const aisResult = mapMdmToAis(exampleMdmParty, '999888777');
console.log(JSON.stringify(aisResult, null, 2));

// ==================== Экспорт ====================
module.exports = {
  mapMdmToAis,
  ORG_FORM_MAP,
  GENDER_MAP,
  DOC_TYPE_MAP,
  PHONE_TYPE_MAP,
  ADDRESS_TYPE_MAP,
};