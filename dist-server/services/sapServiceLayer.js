import axios from 'axios';
import https from 'https';
import { ENV } from '../config/env.js';
class SapServiceLayer {
    client;
    sessionCookie = null;
    isMockMode = ENV.SAP_MOCK_MODE;
    // Realistic mock database stored in-memory during server lifecycle
    mockOrders = [];
    salesPersonsCache = new Map();
    salesPersonsCacheExpires = 0;
    constructor() {
        this.client = axios.create({
            baseURL: ENV.SAP_SERVICE_LAYER_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            // Allow self-signed certificates common in SAP On-Premise environments
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        });
        // Base inicial limpa: sem pedidos fictícios embutidos
        this.mockOrders = [];
    }
    /**
     * Conecta e autentica na Service Layer do SAP Business One
     */
    async login() {
        if (this.isMockMode) {
            return true;
        }
        try {
            const response = await this.client.post('/Login', {
                CompanyDB: ENV.SAP_COMPANY_DB,
                UserName: ENV.SAP_USERNAME,
                Password: ENV.SAP_PASSWORD,
            });
            // Extrai os cookies de sessão B1SESSION e ROUTEID
            const setCookie = response.headers['set-cookie'];
            if (setCookie) {
                this.sessionCookie = setCookie.join('; ');
            }
            return true;
        }
        catch (error) {
            const errorMsg = error.response?.data?.error?.message?.value || error.message;
            console.error('❌ Falha na autenticação com SAP Service Layer:', errorMsg);
            throw new Error(`Falha na autenticação SAP Service Layer: ${errorMsg}`);
        }
    }
    /**
     * Consulta status da conexão e realiza teste ativo de autenticação
     */
    async getStatus() {
        if (this.isMockMode) {
            return {
                connected: true,
                mode: 'mock',
                serverUrl: ENV.SAP_SERVICE_LAYER_URL,
                companyDb: ENV.SAP_COMPANY_DB,
                message: 'Modo Simulação Ativo (Mock SAP Service Layer pronto para operação).',
                lastChecked: new Date().toISOString(),
            };
        }
        try {
            if (!this.sessionCookie) {
                await this.login();
            }
            return {
                connected: true,
                mode: 'real',
                serverUrl: ENV.SAP_SERVICE_LAYER_URL,
                companyDb: ENV.SAP_COMPANY_DB,
                message: `Autenticação ativa no SAP Service Layer! Banco: ${ENV.SAP_COMPANY_DB}`,
                lastChecked: new Date().toISOString(),
            };
        }
        catch (err) {
            const errorMsg = err.response?.data?.error?.message?.value || err.message || 'Servidor SAP indisponível';
            return {
                connected: false,
                mode: 'real',
                serverUrl: ENV.SAP_SERVICE_LAYER_URL,
                companyDb: ENV.SAP_COMPANY_DB,
                message: `Erro na comunicação com SAP Service Layer: ${errorMsg}`,
                lastChecked: new Date().toISOString(),
            };
        }
    }
    /**
     * Alterna dinamicamente o modo de operação (Real / Mock)
     */
    setMockMode(enabled) {
        this.isMockMode = enabled;
    }
    /**
     * Consulta as Filiais / Locais de Negócio (BusinessPlaces) ativas no SAP Service Layer
     */
    async getActiveBranches() {
        if (this.isMockMode) {
            return [];
        }
        try {
            if (!this.sessionCookie) {
                await this.login();
            }
            let items = [];
            try {
                // Tentativa 1: Query com filtro de não desativadas
                const response = await this.client.get('/BusinessPlaces', {
                    headers: { Cookie: this.sessionCookie || '' },
                    params: {
                        $filter: "Disabled eq 'tNO'",
                    },
                });
                items = response.data?.value || [];
            }
            catch (filterErr) {
                // Tentativa 2: Query sem filtro OData caso o campo Disabled varie na versão do SAP
                console.warn('⚠️ Consulta com filtro OData falhou, tentando /BusinessPlaces sem filtro...');
                const fallbackRes = await this.client.get('/BusinessPlaces', {
                    headers: { Cookie: this.sessionCookie || '' },
                });
                items = (fallbackRes.data?.value || []).filter((b) => b.Disabled !== 'tYES' && b.Disabled !== 'Y');
            }
            return items.map((b) => {
                const id = Number(b.BPLID ?? b.BPLId ?? 1);
                const code = String(b.BPLCode || b.BPLName || id).slice(0, 10) || String(id).padStart(2, '0');
                const name = String(b.BPLName || b.AliasName || `Filial ${id}`);
                const cnpj = String(b.FederalTaxID || b.TaxIdNum || b.FederalTaxIDByERP || '');
                return {
                    BPLID: id,
                    BPLName: name,
                    BPLCode: code,
                    FederalTaxID: cnpj,
                    Disabled: b.Disabled || 'tNO',
                    MainBPL: b.MainBPL,
                };
            });
        }
        catch (err) {
            const msg = err.response?.data?.error?.message?.value || err.message;
            console.error('❌ Falha ao consultar BusinessPlaces no SAP Service Layer:', msg);
            throw new Error(`Falha ao consultar filiais no SAP: ${msg}`);
        }
    }
    /**
     * Consulta a lista de Vendedores (/SalesPersons) no SAP Service Layer e mantém cache em memória
     */
    async getSalesPersonsMap() {
        if (this.isMockMode) {
            return this.salesPersonsCache;
        }
        const now = Date.now();
        if (this.salesPersonsCache.size > 0 && now < this.salesPersonsCacheExpires) {
            return this.salesPersonsCache;
        }
        try {
            if (!this.sessionCookie) {
                await this.login();
            }
            let list = [];
            try {
                const response = await this.client.get('/SalesPersons', {
                    headers: { Cookie: this.sessionCookie || '' },
                    params: {
                        $select: 'SalesEmployeeCode,SalesEmployeeName',
                        $top: 500,
                    },
                });
                list = response.data?.value || [];
            }
            catch {
                // Fallback sem $select caso varie no schema da versão SAP
                const fallbackRes = await this.client.get('/SalesPersons', {
                    headers: { Cookie: this.sessionCookie || '' },
                });
                list = fallbackRes.data?.value || [];
            }
            const map = new Map();
            for (const sp of list) {
                const code = sp.SalesEmployeeCode ?? sp.SlpCode ?? sp.Code ?? sp.SalesPersonCode;
                const name = sp.SalesEmployeeName ?? sp.SlpName ?? sp.Name ?? sp.SalesPersonName ?? '';
                if (code !== undefined) {
                    map.set(Number(code), String(name || `Vendedor #${code}`));
                }
            }
            this.salesPersonsCache = map;
            this.salesPersonsCacheExpires = now + 10 * 60 * 1000; // 10 min cache
            return map;
        }
        catch (err) {
            console.warn('⚠️ Não foi possível consultar /SalesPersons no SAP:', err.message);
            return this.salesPersonsCache;
        }
    }
    /**
     * Consulta as listas de picking ativas/liberadas no SAP Service Layer (/PickLists)
     * e retorna um mapa indexado por DocEntry do pedido de venda (BaseObjectType = 17)
     */
    async getActivePickListOrdersMap() {
        if (this.isMockMode) {
            const map = new Map();
            for (const o of this.mockOrders) {
                if (o.PickListId) {
                    map.set(o.DocEntry, {
                        pickListId: o.PickListId,
                        pickStatus: o.PickStatus || 'ps_Released',
                        pickStatusDescription: o.PickStatusDescription || 'Liberado',
                    });
                }
            }
            return map;
        }
        try {
            if (!this.sessionCookie) {
                await this.login();
            }
            let pickLists = [];
            // Tentativa 1: Consulta com $filter e $select correto do SAP Service Layer (Absoluteentry com 'e' minúsculo)
            try {
                const response = await this.client.get('/PickLists', {
                    headers: { Cookie: this.sessionCookie || '' },
                    params: {
                        $filter: "Status eq 'ps_Released' or Status eq 'ps_PartiallyPicked' or Status eq 'ps_Picked'",
                        $select: 'Absoluteentry,Status,PickListsLines',
                        $top: 1000,
                        $orderby: 'Absoluteentry desc',
                    },
                });
                pickLists = response.data?.value || [];
            }
            catch (filterErr) {
                console.warn('⚠️ Consulta OData com filtro em /PickLists falhou, tentando fallback com $select...', filterErr.message);
                try {
                    // Tentativa 2: Consulta com $select e ordenação descrescente
                    const fallbackRes = await this.client.get('/PickLists', {
                        headers: { Cookie: this.sessionCookie || '' },
                        params: {
                            $select: 'Absoluteentry,Status,PickListsLines',
                            $orderby: 'Absoluteentry desc',
                            $top: 1000,
                        },
                    });
                    pickLists = (fallbackRes.data?.value || []).filter((pl) => {
                        const status = String(pl.Status || '');
                        return status !== 'ps_Closed' && status !== 'Closed' && status !== 'C';
                    });
                }
                catch (fallbackErr) {
                    console.warn('⚠️ Fallback de /PickLists também falhou:', fallbackErr.message);
                    pickLists = [];
                }
            }
            const map = new Map();
            for (const pl of pickLists) {
                const absEntry = pl.Absoluteentry ?? pl.AbsoluteEntry ?? pl.DocEntry;
                const plStatus = String(pl.Status || '');
                const lines = pl.PickListsLines || pl.PickListLines || pl.Lines || [];
                for (const line of lines) {
                    const baseType = line.BaseObjectType;
                    const isSalesOrder = baseType === 17 || String(baseType) === '17' || baseType === 'bo_Order' || baseType === 'oOrders' || baseType === undefined;
                    const orderEntry = line.OrderEntry ?? line.OrderDocEntry ?? line.BaseEntry;
                    if (isSalesOrder && orderEntry) {
                        const orderDocEntry = Number(orderEntry);
                        if (!map.has(orderDocEntry)) {
                            let desc = 'Liberado';
                            if (plStatus.includes('Picked') && !plStatus.includes('Partially'))
                                desc = 'Separado';
                            else if (plStatus.includes('Partially'))
                                desc = 'Parcialmente Separado';
                            map.set(orderDocEntry, {
                                pickListId: Number(absEntry),
                                pickStatus: plStatus,
                                pickStatusDescription: desc,
                            });
                        }
                    }
                }
            }
            console.log(`📋 SAP /PickLists: ${map.size} pedidos mapeados em listas de picking ativas.`);
            return map;
        }
        catch (err) {
            console.warn('⚠️ Falha ao consultar /PickLists no SAP Service Layer:', err.message);
            return new Map();
        }
    }
    /**
     * Busca pedidos de venda abertos no SAP Service Layer LIBERADOS DA LISTA DE PICKING e SEM nota fiscal vinculada
     */
    async getOpenOrders(params) {
        if (this.isMockMode) {
            let filtered = [...this.mockOrders];
            if (params?.branchId) {
                filtered = filtered.filter(o => o.BPLId === params.branchId);
            }
            if (params?.city) {
                filtered = filtered.filter(o => o.ShipToCity.toLowerCase().includes(params.city.toLowerCase()));
            }
            if (params?.state) {
                filtered = filtered.filter(o => o.ShipToState.toLowerCase() === params.state.toLowerCase());
            }
            if (params?.startDate) {
                filtered = filtered.filter(o => o.DocDate >= params.startDate);
            }
            if (params?.endDate) {
                filtered = filtered.filter(o => o.DocDate <= params.endDate);
            }
            if (params?.salesPerson) {
                const sp = params.salesPerson.toLowerCase();
                filtered = filtered.filter(o => o.SalesPersonName && o.SalesPersonName.toLowerCase().includes(sp));
            }
            if (params?.search) {
                const s = params.search.toLowerCase();
                filtered = filtered.filter(o => o.DocNum.toString().includes(s) ||
                    o.CardName.toLowerCase().includes(s) ||
                    o.CardCode.toLowerCase().includes(s) ||
                    (o.NumAtCard && o.NumAtCard.toLowerCase().includes(s)) ||
                    (o.SalesPersonName && o.SalesPersonName.toLowerCase().includes(s)) ||
                    (o.PickListId && o.PickListId.toString().includes(s)));
            }
            return filtered;
        }
        // Chamada real ao SAP Service Layer OData
        try {
            if (!this.sessionCookie) {
                await this.login();
            }
            const [salesPersonsMap, activePickListMap] = await Promise.all([
                this.getSalesPersonsMap(),
                this.getActivePickListOrdersMap(),
            ]);
            // Query OData no endpoint /Orders:
            // 1. Status do Documento deve ser Aberto (bost_Open)
            // 2. Se informada filial, filtra pelo BPL_IDAssignedToInvoice
            // 3. Busca todos os pedidos em aberto
            let filter = "DocumentStatus eq 'bost_Open'";
            if (params?.branchId) {
                filter += ` and BPL_IDAssignedToInvoice eq ${params.branchId}`;
            }
            if (params?.startDate) {
                filter += ` and DocDate ge '${params.startDate}'`;
            }
            if (params?.endDate) {
                filter += ` and DocDate le '${params.endDate}'`;
            }
            let rawOrders = [];
            try {
                const response = await this.client.get('/Orders', {
                    params: {
                        $filter: filter,
                        $select: 'DocEntry,DocNum,CardCode,CardName,DocDate,DocDueDate,DocTotal,NumAtCard,Comments,AddressExtension,DocumentLines,DocumentStatus,BPL_IDAssignedToInvoice,BPLName,SequenceSerial,SequenceModel,DownPaymentStatus,SalesPersonCode',
                        $orderby: 'DocEntry desc',
                        $top: 500,
                    },
                    headers: {
                        Cookie: this.sessionCookie || '',
                    },
                });
                rawOrders = response.data?.value || [];
            }
            catch (orderErr) {
                console.warn('⚠️ Consulta OData com $select em /Orders falhou, tentando fallback sem $select...', orderErr.message);
                try {
                    const fallbackRes = await this.client.get('/Orders', {
                        params: {
                            $filter: filter,
                            $orderby: 'DocEntry desc',
                            $top: 500,
                        },
                        headers: {
                            Cookie: this.sessionCookie || '',
                        },
                    });
                    rawOrders = fallbackRes.data?.value || [];
                }
                catch (fallbackOrderErr) {
                    console.error('❌ Falha ao consultar /Orders no SAP Service Layer:', fallbackOrderErr.message);
                    throw fallbackOrderErr;
                }
            }
            // Filtra e mapeia os dados do SAP:
            // 1. Apenas pedidos com lista de picking liberada no SAP
            // 2. Exclui pedidos que já possuam NF emitida ou cujas linhas estejam todas faturadas
            const openOrdersWithoutInvoice = [];
            for (const o of rawOrders) {
                const orderDocEntry = Number(o.DocEntry);
                // Exige que o pedido esteja liberado na Lista de Picking do SAP
                const pickInfo = activePickListMap.get(orderDocEntry);
                if (!pickInfo) {
                    continue;
                }
                // Validação de filial
                if (params?.branchId && o.BPL_IDAssignedToInvoice && o.BPL_IDAssignedToInvoice !== params.branchId) {
                    continue;
                }
                // Filtra apenas as linhas que ainda estão em aberto (sem faturamento/NF total)
                const openLines = (o.DocumentLines || []).filter((line) => {
                    const isOpen = line.LineStatus ? line.LineStatus === 'bost_Open' : true;
                    const remainingQty = line.RemainingOpenQuantity !== undefined ? line.RemainingOpenQuantity : (line.OpenQuantity !== undefined ? line.OpenQuantity : line.Quantity);
                    return isOpen && (remainingQty > 0 || remainingQty === undefined);
                });
                // Se o pedido não tem nenhuma linha em aberto (todas faturadas com NF), ignora
                if (openLines.length === 0 && (o.DocumentLines || []).length > 0) {
                    continue;
                }
                const linesToProcess = openLines.length > 0 ? openLines : (o.DocumentLines || []);
                let totalWeight = 0;
                let totalVolume = 0;
                const lines = linesToProcess.map((line) => {
                    const qty = line.RemainingOpenQuantity || line.OpenQuantity || line.Quantity || 1;
                    const weight = (line.GrossWeight || line.Weight1 || 1.0) * qty;
                    const volume = (line.Volume || 0.05) * qty;
                    totalWeight += weight;
                    totalVolume += volume;
                    return {
                        LineNum: line.LineNum,
                        ItemCode: line.ItemCode,
                        ItemDescription: line.ItemDescription,
                        Quantity: qty,
                        Price: line.Price,
                        LineTotal: line.LineTotal,
                        WeightKg: Number(weight.toFixed(2)),
                        VolumeM3: Number(volume.toFixed(3)),
                        UnitOfMeasure: line.MeasureUnit || 'UN',
                    };
                });
                const pallets = Math.max(1, Math.ceil(totalWeight / 1000));
                const rawSpCode = o.SalesPersonCode ?? o.SlpCode ?? o.SalesEmployeeCode;
                const spCode = rawSpCode !== undefined && rawSpCode !== -1 && rawSpCode !== '-1' ? Number(rawSpCode) : undefined;
                const spName = spCode !== undefined ? (salesPersonsMap.get(spCode) || o.SalesPersonName || `Vendedor #${spCode}`) : (o.SalesPersonName || '');
                openOrdersWithoutInvoice.push({
                    DocEntry: o.DocEntry,
                    DocNum: o.DocNum,
                    CardCode: o.CardCode,
                    CardName: o.CardName,
                    DocDate: o.DocDate ? o.DocDate.split('T')[0] : '',
                    DocDueDate: o.DocDueDate ? o.DocDueDate.split('T')[0] : '',
                    DocTotal: o.DocTotal || 0,
                    NumAtCard: o.NumAtCard || '',
                    Comments: o.Comments || '',
                    BPLId: o.BPL_IDAssignedToInvoice || 1,
                    BPLName: o.BPLName || 'Petruz - Filial',
                    SalesPersonCode: spCode,
                    SalesPersonName: spName,
                    PickListId: pickInfo.pickListId,
                    PickStatus: pickInfo.pickStatus,
                    PickStatusDescription: pickInfo.pickStatusDescription,
                    ShipToCity: o.AddressExtension?.ShipToCity || o.AddressExtension?.City || 'Belém',
                    ShipToState: o.AddressExtension?.ShipToState || o.AddressExtension?.State || 'PA',
                    AddressExtension: o.AddressExtension,
                    TotalWeightKg: Number(totalWeight.toFixed(2)),
                    TotalVolumeM3: Number(totalVolume.toFixed(3)),
                    EstimatedPallets: pallets,
                    DocumentStatus: o.DocumentStatus || 'bost_Open',
                    DocumentLines: lines,
                });
            }
            console.log(`📦 SAP /Orders: ${rawOrders.length} pedidos abertos consultados no SAP. ${openOrdersWithoutInvoice.length} com Lista de Picking ativa vinculada.`);
            let result = openOrdersWithoutInvoice;
            if (params?.city) {
                result = result.filter(o => o.ShipToCity.toLowerCase().includes(params.city.toLowerCase()));
            }
            if (params?.state) {
                result = result.filter(o => o.ShipToState.toLowerCase() === params.state.toLowerCase());
            }
            if (params?.salesPerson) {
                const sp = params.salesPerson.toLowerCase();
                result = result.filter(o => o.SalesPersonName && o.SalesPersonName.toLowerCase().includes(sp));
            }
            if (params?.search) {
                const s = params.search.toLowerCase();
                result = result.filter(o => o.DocNum.toString().includes(s) ||
                    o.CardName.toLowerCase().includes(s) ||
                    o.CardCode.toLowerCase().includes(s) ||
                    (o.NumAtCard && o.NumAtCard.toLowerCase().includes(s)) ||
                    (o.SalesPersonName && o.SalesPersonName.toLowerCase().includes(s)) ||
                    (o.PickListId && o.PickListId.toString().includes(s)));
            }
            return result;
        }
        catch (err) {
            if (!this.isMockMode) {
                const sapMsg = err.response?.data?.error?.message?.value || err.message;
                throw new Error(`Falha na comunicação com SAP Service Layer: ${sapMsg}`);
            }
            console.warn('Erro ao consultar SAP real. Utilizando fallback simulador:', err.message);
            return this.mockOrders;
        }
    }
    /**
     * Busca um pedido específico pelo DocEntry
     */
    async getOrderByDocEntry(docEntry) {
        const orders = await this.getOpenOrders();
        const found = orders.find(o => o.DocEntry === docEntry);
        if (found)
            return found;
        if (this.isMockMode)
            return null;
        // Consulta direta ao SAP por DocEntry
        try {
            await this.login();
            const [salesPersonsMap, activePickListMap] = await Promise.all([
                this.getSalesPersonsMap(),
                this.getActivePickListOrdersMap(),
            ]);
            const pickInfo = activePickListMap.get(docEntry);
            const response = await this.client.get(`/Orders(${docEntry})`, {
                headers: { Cookie: this.sessionCookie || '' },
            });
            const o = response.data;
            if (!o)
                return null;
            const rawSpCode = o.SalesPersonCode ?? o.SlpCode ?? o.SalesEmployeeCode;
            const spCode = rawSpCode !== undefined && rawSpCode !== -1 && rawSpCode !== '-1' ? Number(rawSpCode) : undefined;
            const spName = spCode !== undefined ? (salesPersonsMap.get(spCode) || o.SalesPersonName || `Vendedor #${spCode}`) : (o.SalesPersonName || '');
            let totalWeight = 0;
            let totalVolume = 0;
            const lines = (o.DocumentLines || []).map((line) => {
                const qty = line.RemainingOpenQuantity || line.OpenQuantity || line.Quantity || 1;
                const weight = (line.GrossWeight || line.Weight1 || 1.0) * qty;
                const volume = (line.Volume || 0.05) * qty;
                totalWeight += weight;
                totalVolume += volume;
                return {
                    LineNum: line.LineNum,
                    ItemCode: line.ItemCode,
                    ItemDescription: line.ItemDescription,
                    Quantity: qty,
                    Price: line.Price,
                    LineTotal: line.LineTotal,
                    WeightKg: Number(weight.toFixed(2)),
                    VolumeM3: Number(volume.toFixed(3)),
                    UnitOfMeasure: line.MeasureUnit || 'UN',
                };
            });
            return {
                DocEntry: o.DocEntry,
                DocNum: o.DocNum,
                CardCode: o.CardCode,
                CardName: o.CardName,
                DocDate: o.DocDate ? o.DocDate.split('T')[0] : '',
                DocDueDate: o.DocDueDate ? o.DocDueDate.split('T')[0] : '',
                DocTotal: o.DocTotal || 0,
                NumAtCard: o.NumAtCard || '',
                Comments: o.Comments || '',
                BPLId: o.BPL_IDAssignedToInvoice || 1,
                BPLName: o.BPLName || 'Petruz - Filial',
                SalesPersonCode: spCode,
                SalesPersonName: spName,
                PickListId: pickInfo?.pickListId,
                PickStatus: pickInfo?.pickStatus,
                PickStatusDescription: pickInfo?.pickStatusDescription || 'Liberado',
                ShipToCity: o.AddressExtension?.ShipToCity || o.AddressExtension?.City || 'Belém',
                ShipToState: o.AddressExtension?.ShipToState || o.AddressExtension?.State || 'PA',
                AddressExtension: o.AddressExtension,
                TotalWeightKg: Number(totalWeight.toFixed(2)),
                TotalVolumeM3: Number(totalVolume.toFixed(3)),
                EstimatedPallets: Math.max(1, Math.ceil(totalWeight / 1000)),
                DocumentStatus: o.DocumentStatus || 'bost_Open',
                DocumentLines: lines,
            };
        }
        catch (err) {
            console.warn(`Erro ao consultar pedido #${docEntry} no SAP:`, err.message);
            return null;
        }
    }
    /**
     * Verifica se a montagem de carga já existe no SAP (Idempotência)
     */
    async checkIfLoadExistsInSap(loadNumber) {
        if (this.isMockMode) {
            const existing = this.mockOrders.find(o => o.Comments?.includes(loadNumber));
            if (existing) {
                return { exists: true, docEntry: existing.DocEntry + 90000, message: 'Lançamento já localizado no SAP.' };
            }
            return { exists: false };
        }
        try {
            await this.login();
            const filter = `contains(Remarks, '${loadNumber}') or contains(Comments, '${loadNumber}')`;
            const response = await this.client.get('/PickLists', {
                headers: { Cookie: this.sessionCookie || '' },
                params: {
                    $filter: filter,
                    $top: 1,
                },
            });
            if (response.data?.value && response.data.value.length > 0) {
                const item = response.data.value[0];
                const docEntry = item.AbsoluteEntry || item.Absoluteentry || item.DocEntry;
                return {
                    exists: true,
                    docEntry: docEntry,
                    message: `Montagem de carga ${loadNumber} já existente no SAP (DocEntry: ${docEntry}).`,
                };
            }
            return { exists: false };
        }
        catch (err) {
            console.warn(`Verificação de carga ${loadNumber} no SAP: ${err.message}`);
            return { exists: false };
        }
    }
    /**
     * Envia a Montagem de Carga para o SAP Service Layer com proteção contra duplicidade
     */
    async syncLoadToSap(loadAssembly, items) {
        // 1. Verifica se já existe o lançamento no SAP
        const check = await this.checkIfLoadExistsInSap(loadAssembly.load_number);
        if (check.exists && check.docEntry) {
            return {
                alreadyExists: true,
                docEntry: check.docEntry,
                message: `A Montagem de Carga ${loadAssembly.load_number} já está registrada no SAP Business One (DocEntry: ${check.docEntry}). Nenhuma duplicidade foi criada.`,
            };
        }
        // 2. Se for modo simulado, gera DocEntry sequencial
        if (this.isMockMode) {
            const simulatedDocEntry = 80000 + Math.floor(Math.random() * 10000);
            return {
                alreadyExists: false,
                docEntry: simulatedDocEntry,
                message: `Montagem de Carga ${loadAssembly.load_number} sincronizada com sucesso no SAP Business One (DocEntry: ${simulatedDocEntry}).`,
            };
        }
        // 3. Em modo real, envia PickList ou Draft para o SAP Service Layer
        try {
            await this.login();
            const pickLines = items.map((it) => ({
                OrderEntry: it.doc_entry,
                OrderRowID: 0,
                ReleasedQuantity: it.weight_kg || 1,
            }));
            const payload = {
                Remarks: `Montagem de Carga ${loadAssembly.load_number} - Doc: ${loadAssembly.doc_number || ''} - Veículo: ${loadAssembly.plate || ''}`,
                Status: 'ps_Released',
                PickListsLines: pickLines,
            };
            const response = await this.client.post('/PickLists', payload, {
                headers: { Cookie: this.sessionCookie || '' },
            });
            const generatedDocEntry = response.data?.AbsoluteEntry || response.data?.Absoluteentry || response.data?.DocEntry || 1;
            return {
                alreadyExists: false,
                docEntry: generatedDocEntry,
                message: `Montagem de Carga ${loadAssembly.load_number} criada no SAP Service Layer com sucesso (DocEntry: ${generatedDocEntry})!`,
            };
        }
        catch (err) {
            console.error('Erro ao enviar montagem de carga para o SAP:', err.response?.data || err.message);
            throw new Error(`Erro no SAP Service Layer: ${err.response?.data?.error?.message?.value || err.message}`);
        }
    }
}
export const sapService = new SapServiceLayer();
