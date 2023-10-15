import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {Resolver} from "./resolver.model"

@Entity_()
export class MulticoinAddrChanged {
    constructor(props?: Partial<MulticoinAddrChanged>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Resolver, {nullable: true})
    resolver!: Resolver

    @Column_("int4", {nullable: false})
    blockNumber!: number

    @Column_("bytea", {nullable: false})
    transactionID!: Uint8Array

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    coinType!: bigint

    @Column_("bytea", {nullable: false})
    addr!: Uint8Array
}
