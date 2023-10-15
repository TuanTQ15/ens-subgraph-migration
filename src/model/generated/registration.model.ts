import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, OneToOne as OneToOne_, Index as Index_, JoinColumn as JoinColumn_, ManyToOne as ManyToOne_, OneToMany as OneToMany_} from "typeorm"
import * as marshal from "./marshal"
import {Domain} from "./domain.model"
import {Account} from "./account.model"
import {RegistrationEvent} from "./registrationEvent.model"

@Entity_()
export class Registration {
    constructor(props?: Partial<Registration>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_({unique: true})
    @OneToOne_(() => Domain, {nullable: true})
    @JoinColumn_()
    domain!: Domain

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    registrationDate!: bigint

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    expiryDate!: bigint

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: true})
    cost!: bigint | undefined | null

    @Index_()
    @ManyToOne_(() => Account, {nullable: true})
    registrant!: Account

    @Column_("text", {nullable: true})
    labelName!: string | undefined | null

    @OneToMany_(() => RegistrationEvent, e => e.registration)
    events!: RegistrationEvent[]
}
