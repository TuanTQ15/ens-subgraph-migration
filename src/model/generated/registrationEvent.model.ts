import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {Registration} from "./registration.model"
import {NameRegistered} from "./nameRegistered.model"
import {NameRenewed} from "./nameRenewed.model"
import {NameTransferred} from "./nameTransferred.model"
import {WrappedDomain} from "./wrappedDomain.model"

@Entity_()
export class RegistrationEvent {
    constructor(props?: Partial<RegistrationEvent>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Registration, {nullable: true})
    registration!: Registration

    @Column_("int4", {nullable: false})
    blockNumber!: number

    @Column_("bytea", {nullable: false})
    transactionID!: Uint8Array

    @Index_()
    @ManyToOne_(() => NameRegistered, {nullable: true})
    nameRegistered!: NameRegistered | undefined | null

    @Index_()
    @ManyToOne_(() => NameRenewed, {nullable: true})
    nameRenewed!: NameRenewed | undefined | null

    @Index_()
    @ManyToOne_(() => NameTransferred, {nullable: true})
    nameTransferred!: NameTransferred | undefined | null

    @Index_()
    @ManyToOne_(() => WrappedDomain, {nullable: true})
    wrappedDomain!: WrappedDomain | undefined | null
}
