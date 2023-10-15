import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import {Resolver} from "./resolver.model"
import {AddrChanged} from "./addrChanged.model"
import {MulticoinAddrChanged} from "./multicoinAddrChanged.model"
import {NameChanged} from "./nameChanged.model"
import {AbiChanged} from "./abiChanged.model"
import {PubkeyChanged} from "./pubkeyChanged.model"
import {TextChanged} from "./textChanged.model"
import {ContenthashChanged} from "./contenthashChanged.model"
import {InterfaceChanged} from "./interfaceChanged.model"
import {AuthorisationChanged} from "./authorisationChanged.model"
import {VersionChanged} from "./versionChanged.model"

@Entity_()
export class ResolverEvent {
    constructor(props?: Partial<ResolverEvent>) {
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

    @Index_()
    @ManyToOne_(() => AddrChanged, {nullable: true})
    addrChanged!: AddrChanged | undefined | null

    @Index_()
    @ManyToOne_(() => MulticoinAddrChanged, {nullable: true})
    multicoinAddrChanged!: MulticoinAddrChanged | undefined | null

    @Index_()
    @ManyToOne_(() => NameChanged, {nullable: true})
    nameChanged!: NameChanged | undefined | null

    @Index_()
    @ManyToOne_(() => AbiChanged, {nullable: true})
    abiChanged!: AbiChanged | undefined | null

    @Index_()
    @ManyToOne_(() => PubkeyChanged, {nullable: true})
    pubkeyChanged!: PubkeyChanged | undefined | null

    @Index_()
    @ManyToOne_(() => TextChanged, {nullable: true})
    textChanged!: TextChanged | undefined | null

    @Index_()
    @ManyToOne_(() => ContenthashChanged, {nullable: true})
    contenthashChanged!: ContenthashChanged | undefined | null

    @Index_()
    @ManyToOne_(() => InterfaceChanged, {nullable: true})
    interfaceChanged!: InterfaceChanged | undefined | null

    @Index_()
    @ManyToOne_(() => AuthorisationChanged, {nullable: true})
    authorisationChanged!: AuthorisationChanged | undefined | null

    @Index_()
    @ManyToOne_(() => VersionChanged, {nullable: true})
    versionChanged!: VersionChanged | undefined | null
}
