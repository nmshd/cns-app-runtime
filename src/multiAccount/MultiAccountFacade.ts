import { DeviceMapper, DeviceOnboardingInfoDTO } from "@nmshd/runtime"
import { CoreId, Realm } from "@nmshd/transport"
import { AppRuntimeErrors } from "../AppRuntimeErrors"
import { UserfriendlyResult } from "../UserfriendlyResult"
import { LocalAccountDTO } from "./data/LocalAccountDTO"
import { LocalAccountMapper } from "./data/LocalAccountMapper"
import { MultiAccountController } from "./MultiAccountController"

export class MultiAccountFacade {
    public constructor(protected readonly multiAccountController: MultiAccountController) {}

    public async createAccount(realm: string, name: string): Promise<UserfriendlyResult<LocalAccountDTO>> {
        if (realm !== Realm.Dev && realm !== Realm.Prod && realm !== Realm.Stage) {
            throw AppRuntimeErrors.multiAccount.wrongRealm()
        }
        const [localAccount] = await this.multiAccountController.createAccount(realm, name)
        return UserfriendlyResult.ok(LocalAccountMapper.toLocalAccountDTO(localAccount))
    }

    public async onboardAccount(onboardingInfo: DeviceOnboardingInfoDTO): Promise<UserfriendlyResult<LocalAccountDTO>> {
        const sharedSecret = await DeviceMapper.toDeviceSharedSecret(onboardingInfo)
        const [localAccount] = await this.multiAccountController.onboardDevice(sharedSecret)
        const localAccountDTO = LocalAccountMapper.toLocalAccountDTO(localAccount)
        return UserfriendlyResult.ok(localAccountDTO)
    }

    public async getAccount(id: string): Promise<UserfriendlyResult<LocalAccountDTO>> {
        const localAccount = await this.multiAccountController.getAccount(CoreId.from(id))
        return UserfriendlyResult.ok(LocalAccountMapper.toLocalAccountDTO(localAccount))
    }

    public async getAccountByAddress(address: string): Promise<UserfriendlyResult<LocalAccountDTO>> {
        const localAccount = await this.multiAccountController.getAccountByAddress(address)
        return UserfriendlyResult.ok(LocalAccountMapper.toLocalAccountDTO(localAccount))
    }

    public async getAccounts(): Promise<UserfriendlyResult<LocalAccountDTO[]>> {
        const localAccounts = await this.multiAccountController.getAccounts()
        return UserfriendlyResult.ok(localAccounts.map((account) => LocalAccountMapper.toLocalAccountDTO(account)))
    }

    public async clearAccounts(): Promise<UserfriendlyResult<void>> {
        return UserfriendlyResult.ok(await this.multiAccountController.clearAccounts())
    }

    public async renameAccount(localAccountId: string, newAccountName: string): Promise<UserfriendlyResult<void>> {
        return UserfriendlyResult.ok(
            await this.multiAccountController.renameLocalAccount(CoreId.from(localAccountId), newAccountName)
        )
    }
}
