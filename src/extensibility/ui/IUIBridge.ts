import { Result } from "@js-soft/ts-utils"
import {
    IdentityDVO,
    MailDVO,
    MessageDVO,
    RelationshipChangeDTO,
    RelationshipTemplateDTO,
    RequestMessageDVO,
    TokenDTO
} from "@nmshd/runtime"
import { LocalAccountDTO } from "../../multiAccount"
import { UserfriendlyApplicationError } from "../../UserfriendlyApplicationError"

export interface IUIBridge {
    showMessage(
        account: LocalAccountDTO,
        relationship: IdentityDVO,
        message: MessageDVO | MailDVO | RequestMessageDVO
    ): Promise<Result<void>>
    showRelationship(account: LocalAccountDTO, relationship: IdentityDVO): Promise<Result<void>>
    showRelationshipChange(
        account: LocalAccountDTO,
        relationship: IdentityDVO,
        change: RelationshipChangeDTO
    ): Promise<Result<void>>
    showRelationshipTemplate(
        account: LocalAccountDTO,
        relationshipTemplate: RelationshipTemplateDTO
    ): Promise<Result<void>>
    showDeviceOnboarding(token: TokenDTO): Promise<Result<void>>
    showRecovery(token: TokenDTO): Promise<Result<void>>
    showError(error: UserfriendlyApplicationError, account?: LocalAccountDTO): Promise<Result<void>>
    requestAccountSelection(
        possibleAccounts: LocalAccountDTO[],
        title?: string,
        description?: string
    ): Promise<Result<LocalAccountDTO>>
}
