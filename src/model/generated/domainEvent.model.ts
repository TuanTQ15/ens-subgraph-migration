import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {Domain} from "./domain.model"
import {Transfer} from "./transfer.model"
import {NewOwner} from "./newOwner.model"
import {NewResolver} from "./newResolver.model"
import {NewTTL} from "./newTtl.model"
import {WrappedTransfer} from "./wrappedTransfer.model"
import {NameWrapped} from "./nameWrapped.model"
import {NameUnwrapped} from "./nameUnwrapped.model"
import {FusesSet} from "./fusesSet.model"
import {ExpiryExtended} from "./expiryExtended.model"

@Entity_()
export class DomainEvent {
    constructor(props?: Partial<DomainEvent>) {
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

    @Index_()
    @ManyToOne_(() => Transfer, {nullable: true})
    transfer!: Transfer | undefined | null

    @Index_()
    @ManyToOne_(() => NewOwner, {nullable: true})
    newOwner!: NewOwner | undefined | null

    @Index_()
    @ManyToOne_(() => NewResolver, {nullable: true})
    newResolver!: NewResolver | undefined | null

    @Index_()
    @ManyToOne_(() => NewTTL, {nullable: true})
    newTTL!: NewTTL | undefined | null

    @Index_()
    @ManyToOne_(() => WrappedTransfer, {nullable: true})
    wrappedTransfer!: WrappedTransfer | undefined | null

    @Index_()
    @ManyToOne_(() => NameWrapped, {nullable: true})
    wrappedName!: NameWrapped | undefined | null

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: true})
    wrappedExpiryDate!: bigint | undefined | null

    @Index_()
    @ManyToOne_(() => NameUnwrapped, {nullable: true})
    unwrappedName!: NameUnwrapped | undefined | null

    @Index_()
    @ManyToOne_(() => FusesSet, {nullable: true})
    fusesSet!: FusesSet | undefined | null

    @Index_()
    @ManyToOne_(() => ExpiryExtended, {nullable: true})
    expiryExtended!: ExpiryExtended | undefined | null
}
