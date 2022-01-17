import { SerializableAsync } from "@js-soft/ts-serval"
import { TokenContentDeviceSharedSecret, TokenContentRelationshipTemplate } from "@nmshd/transport"
import { AppRuntimeErrors } from "../../AppRuntimeErrors"
import { LocalAccountDTO } from "../../multiAccount/data/LocalAccountDTO"
import { UserfriendlyResult } from "../../UserfriendlyResult"
import { AppRuntimeFacade } from "./AppRuntimeFacade"

export class AppStringProcessorFacade extends AppRuntimeFacade {
    private static readonly urlRegex = /^\s*(nmshd:\/\/)(?<data>[A-Za-z0-9\-_#]{2,992})\s*$/

    public async processURL(url: string, account?: LocalAccountDTO): Promise<UserfriendlyResult<void>> {
        const urlResult = this.parseURL(url)
        if (urlResult.isError) {
            return UserfriendlyResult.fail(urlResult.error)
        }

        const parsedUrl = urlResult.value
        if (parsedUrl.startsWith("qr#")) {
            return await this.processCode(parsedUrl.substring(3), account)
        }
        return UserfriendlyResult.fail(AppRuntimeErrors.startup.wrongURL())
    }

    private parseURL(url: string): UserfriendlyResult<string> {
        const regexResult = AppStringProcessorFacade.urlRegex.exec(url)

        if (!regexResult) {
            return UserfriendlyResult.fail(AppRuntimeErrors.startup.wrongURL())
        }

        return UserfriendlyResult.ok(regexResult.groups!.data)
    }

    public async processCode(code: string, account?: LocalAccountDTO): Promise<UserfriendlyResult<void>> {
        const truncatedReference = code
        const tokenResult = await this.runtime.anonymousServices.tokens.loadPeerTokenByTruncatedReference({
            reference: truncatedReference
        })
        if (tokenResult.isError) {
            return await this.parseErrorResult<void>(tokenResult)
        }
        const tokenDTO = tokenResult.value
        const content = tokenDTO.content
        const uiBridge = await this.runtime.uiBridge()

        try {
            const tokenContent = await SerializableAsync.fromUnknown(content)

            if (tokenContent instanceof TokenContentRelationshipTemplate) {
                const templateResult =
                    await this.runtime.transportServices.relationshipTemplates.loadPeerRelationshipTemplate({
                        id: tokenContent.templateId.toString(),
                        secretKey: tokenContent.secretKey.toBase64()
                    })
                if (templateResult.isError) {
                    return await this.parseErrorResult<void>(templateResult)
                }

                let useAccount = account
                if (!useAccount) {
                    const bestAccountResult = await this.runtime.queryAccount()
                    if (bestAccountResult.isError) {
                        return UserfriendlyResult.fail(bestAccountResult.error)
                    }
                    useAccount = bestAccountResult.value
                }

                await uiBridge.showRelationshipTemplate(useAccount, templateResult.value)
            } else if (tokenContent instanceof TokenContentDeviceSharedSecret) {
                await uiBridge.showDeviceOnboarding(tokenDTO)
            }
        } catch (e) {
            const error = AppRuntimeErrors.startup.wrongCode()
            await uiBridge.showError(error)
            return UserfriendlyResult.fail(error)
        }
        return UserfriendlyResult.ok(undefined)
    }
}
