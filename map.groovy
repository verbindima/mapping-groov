import groovy.json.JsonSlurper
import groovy.json.JsonOutput
import org.apache.nifi.processor.io.StreamCallback
import java.nio.charset.StandardCharsets

// Получаем доступ к API NiFi
def flowFile = session.get()
if (!flowFile) return

try {
    // Читаем содержимое FlowFile
    flowFile = session.write(flowFile, { inputStream, outputStream ->
        def inputText = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8)

        // Парсим JSON
        def jsonSlurper = new JsonSlurper()
        def party = jsonSlurper.parseText(inputText)

        if (!party.keySet()) {
            throw new Exception("Empty or invalid JSON input")
        }

        def Subjects = []
        def blockedFields = [
            'deathDate',
            'deathDateAuthor',
            'deleted',
            'hidden',
            'cardClassAuthor',
            'hid'
        ]

        // Функция для маппинга полей
        def mapField(fieldArr) {
            def fields = [:]
            fieldArr.each { field ->
                if (!blockedFields.contains(field.name)) {
                    fields[field.name] = field.value
                }
            }
            return fields
        }

        // Функция для получения источников
        def getSources(sourceArr) {
            if (!sourceArr || !sourceArr.size()) {
                return [:]
            }
            return [
                source: sourceArr.collect { source ->
                    [sourceSystem: source.sourceSystem, rawId: source.rawId]
                }
            ]
        }

        // Если party.party не массив, преобразуем его в массив
        if (!(party.party instanceof List)) {
            party.party = [party.party]
        }

        party.party.each { partyItem ->
            def CLIENT = []
            def clientArr = [:]
            def resultArr = [:]
            def addressArr = []
            def documentArr = []
            def phoneArr = []
            def emailArr = []
            def externalArr = []
            def plArr = []
            def lkArr = []
            def vyArr = []
            def agreementArr = []
            def businessConsentArr = []
            def consentRevocationArr = []

            // Маппинг CLIENT
            CLIENT << [
                rawId: partyItem.rawId,
                sourceSystem: partyItem.sourceSystem,
                *: mapField(partyItem.field),
                *: clientArr
            ]
            resultArr['CLIENT'] = CLIENT

            // Обработка атрибутов
            if (partyItem.attribute && partyItem.attribute.size()) {
                partyItem.attribute.each { attribute ->
                    switch (attribute.type) {
                        case 'ADDRESS':
                            def address = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            addressArr << address
                            break
                        case 'DOCUMENT_PASSPORT':
                            def document = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            documentArr << document
                            break
                        case 'PHONE':
                            def phone = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            phoneArr << phone
                            break
                        case 'EMAIL':
                            def email = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            emailArr << email
                            break
                        case 'EXTERNAL_IDENTIFIER':
                            def clientIdExtSystem = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            externalArr << clientIdExtSystem
                            break
                        case 'LOYALTY':
                            def loyalty = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            plArr << loyalty
                            break
                        case 'PERSONAL_ACCOUNT':
                            def lk = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            lkArr << lk
                            break
                        case 'DRIVING_CATEGORY':
                            def vy = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            vyArr << vy
                            break
                        case 'AGREEMENT':
                            def agreement = [
                                sourceSystem: attribute.sourceSystem,
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            agreementArr << agreement
                            break
                        case 'BUSINESS_CONSENT':
                            def businessConsent = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            businessConsentArr << businessConsent
                            break
                        case 'CONSENT_REVOCATION':
                            def consentRevocation = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field),
                                *: getSources(attribute.source)
                            ]
                            consentRevocationArr << consentRevocation
                            break
                    }
                }

                if (addressArr) resultArr['ADDRESS'] = addressArr
                if (documentArr) resultArr['DOCUMENT'] = documentArr
                if (phoneArr) resultArr['PHONE'] = phoneArr
                if (emailArr) resultArr['EMAIL'] = emailArr
                if (externalArr) resultArr['clientIdExtSystem'] = externalArr
                if (plArr) resultArr['PL'] = plArr
                if (lkArr) resultArr['LK'] = lkArr
                if (vyArr) resultArr['VY'] = vyArr
                if (agreementArr) resultArr['AGREEMENT'] = agreementArr
                if (businessConsentArr) resultArr['BusinessConsent'] = businessConsentArr
                if (consentRevocationArr) resultArr['ConsentRevocation'] = consentRevocationArr
            }

            // Обработка отношений
            if (partyItem.relation && partyItem.relation.size()) {
                def relationAttributes = []
                partyItem.relation.each { attribute ->
                    attribute.remove('hid')
                    def resultAttribute = attribute.collectEntries { key, value ->
                        if (value?.hid) value.remove('hid')
                        [(key): value]
                    }
                    relationAttributes << resultAttribute
                }
                if (relationAttributes) resultArr['RELATION'] = relationAttributes
            }

            // Обработка прошлых атрибутов
            def pastFioArr = []
            def pastDocumentArr = []
            if (partyItem.pastAttribute && partyItem.pastAttribute.size()) {
                partyItem.pastAttribute.each { attribute ->
                    switch (attribute.type) {
                        case 'FIO':
                            def fio = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field)
                            ]
                            pastFioArr << fio
                            break
                        case 'DOCUMENT_PASSPORT':
                            def pastDocument = [
                                rawId: attribute.rawId,
                                *: mapField(attribute.field)
                            ]
                            pastDocumentArr << pastDocument
                            break
                    }
                }
            }
            if (pastFioArr) resultArr['PastFIO'] = pastFioArr
            if (pastDocumentArr) resultArr['PastDocument'] = pastDocumentArr

            // Обработка источников
            if (partyItem.source && partyItem.source.size()) {
                def sources = []
                partyItem.source.each { element ->
                    sources << [
                        sourceSystem: element.sourceSystem,
                        rawId: element.rawId,
                        *: mapField(element.field)
                    ]
                }
                if (sources) resultArr['SOURCE'] = sources
            }

            Subjects << resultArr
        }

        def result = [Subjects: Subjects]

        // Преобразуем результат в JSON
        def outputJson = JsonOutput.toJson(result)

        // Записываем результат в выходной поток
        outputStream.write(outputJson.getBytes(StandardCharsets.UTF_8))
    } as StreamCallback)

    // Передаем обработанный FlowFile дальше
    session.transfer(flowFile, REL_SUCCESS)
} catch (Exception e) {
    // Логируем ошибку и передаем FlowFile в очередь ошибок
    log.error("Error processing FlowFile: ${e.message}", e)
    session.transfer(flowFile, REL_FAILURE)
}
