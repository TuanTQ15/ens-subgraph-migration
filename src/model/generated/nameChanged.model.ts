import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {Resolver} from "./resolver.model"

@Entity_()
export class NameChanged {
    constructor(props?: Partial<NameChanged>) {
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

    @Column_("text", {nullable: false})
    name!: string
}
