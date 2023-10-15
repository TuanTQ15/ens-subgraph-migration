import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {Domain} from "./domain.model"
import {Account} from "./account.model"

@Entity_()
export class NameWrapped {
    constructor(props?: Partial<NameWrapped>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Domain, {nullable: true})
    domain!: Domain

    @Column_("int4", {nullable: false})
    blockNumber!: number

    @Column_("bytea", {nullable: false})
    transactionID!: Uint8Array

    @Column_("text", {nullable: true})
    name!: string | undefined | null

    @Column_("int4", {nullable: false})
    wrappedFuses!: number

    @Index_()
    @ManyToOne_(() => Account, {nullable: true})
    owner!: Account

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    wrappedExpiryDate!: bigint
}
