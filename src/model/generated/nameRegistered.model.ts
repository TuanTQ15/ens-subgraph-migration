import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {Registration} from "./registration.model"
import {Account} from "./account.model"

@Entity_()
export class NameRegistered {
    constructor(props?: Partial<NameRegistered>) {
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
    @ManyToOne_(() => Account, {nullable: true})
    registrant!: Account

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    expiryDate!: bigint
}
