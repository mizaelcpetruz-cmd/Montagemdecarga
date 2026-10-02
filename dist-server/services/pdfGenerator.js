import PDFDocument from 'pdfkit';
export class PdfGeneratorService {
    static async generateLoadManifestPdf(data) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 20,
                    bufferPages: true,
                    info: {
                        Title: `Conferencia_Lotes_${data.docNumber || data.loadNumber}`,
                        Author: 'Petruz Fruity - Sistema de Montagem de Carga',
                        Subject: 'Conferência de Lotes Lokfrio',
                    },
                });
                const buffers = [];
                doc.on('data', (chunk) => buffers.push(chunk));
                doc.on('end', () => {
                    try {
                        // Adiciona numeração de páginas no rodapé de todas as páginas
                        const range = doc.bufferedPageRange();
                        for (let i = 0; i < range.count; i++) {
                            doc.switchToPage(i);
                            doc.fillColor('#666666').fontSize(7).font('Helvetica')
                                .text(`Página ${i + 1} de ${range.count} • Documento de Conferência de Carga • Petruz Fruity`, 20, 818, { width: 555.28, align: 'center' });
                        }
                        resolve(Buffer.concat(buffers));
                    }
                    catch (err) {
                        resolve(Buffer.concat(buffers));
                    }
                });
                doc.on('error', (err) => reject(err));
                const marginLeft = 20;
                const pageWidth = 595.28; // Largura A4 em pontos
                const contentWidth = pageWidth - marginLeft * 2; // 555.28 pt
                const pageBottom = 800; // Limite inferior antes do rodapé
                // ==========================================
                // 1. CABEÇALHO SUPERIOR (Logo, Título Central, Data)
                // ==========================================
                const drawHeader = (startY) => {
                    // Logotipo Petruz Fruity / Filial
                    let logoDrawn = false;
                    if (data.branch.logoUrl && data.branch.logoUrl.startsWith('data:image')) {
                        try {
                            const base64Data = data.branch.logoUrl.replace(/^data:image\/\w+;base64,/, '');
                            const imgBuffer = Buffer.from(base64Data, 'base64');
                            doc.image(imgBuffer, marginLeft, startY, { width: 95, height: 40, fit: [95, 40] });
                            logoDrawn = true;
                        }
                        catch (e) {
                            logoDrawn = false;
                        }
                    }
                    if (!logoDrawn) {
                        doc.save();
                        // Folhinha verde no topo do ícone
                        doc.path(`M ${marginLeft + 19} ${startY + 6} Q ${marginLeft + 24} ${startY + 2} ${marginLeft + 26} ${startY + 6} Q ${marginLeft + 23} ${startY + 10} ${marginLeft + 19} ${startY + 6}`)
                            .fillColor('#43a047').fill();
                        // Espiral vinho/magenta
                        doc.circle(marginLeft + 13, startY + 17, 9.5).lineWidth(2.2).strokeColor('#c2185b').stroke();
                        doc.circle(marginLeft + 13, startY + 17, 5).lineWidth(1.6).strokeColor('#880e4f').stroke();
                        doc.circle(marginLeft + 13, startY + 17, 1.8).fillColor('#4a148c').fill();
                        // Texto Petruz
                        doc.fillColor('#c2185b').fontSize(15).font('Helvetica-Bold')
                            .text('Petruz', marginLeft + 27, startY + 7);
                        // Texto fruity
                        doc.fillColor('#880e4f').fontSize(8.5).font('Helvetica')
                            .text('fruity', marginLeft + 51, startY + 23);
                        doc.restore();
                    }
                    // Título Central: CONFERÊNCIA DE LOTES LOKFRIO
                    const title = (data.conferenceTitle || 'CONFERÊNCIA DE LOTES LOKFRIO').toUpperCase();
                    doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold')
                        .text(title, marginLeft, startY + 20, {
                        width: contentWidth,
                        align: 'center',
                    });
                    // Canto Superior Direito: Data e Hora da Impressão
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('pt-BR');
                    const timeStr = now.toLocaleTimeString('pt-BR');
                    doc.fillColor('#000000').fontSize(7.5).font('Helvetica')
                        .text('Data da Impressão:', pageWidth - marginLeft - 130, startY + 8, { width: 130, align: 'right' })
                        .text(`${dateStr} - ${timeStr}`, pageWidth - marginLeft - 130, startY + 18, { width: 130, align: 'right' });
                    // ==========================================
                    // 2. SUB-CABEÇALHO (Veiculo, Placa, Nº Documento)
                    // ==========================================
                    const subHeaderY = startY + 48;
                    doc.fillColor('#000000').fontSize(8.5).font('Helvetica');
                    // Veiculo
                    const vehicleModel = data.vehicle.model || 'HYUNDAI HR';
                    doc.text(`Veiculo: ${vehicleModel}`, marginLeft + 110, subHeaderY);
                    // Placa
                    const vehiclePlate = data.vehicle.plate || 'NUX 8E55';
                    doc.text(`Placa: ${vehiclePlate}`, marginLeft + 280, subHeaderY);
                    // Nº Documento (em negrito destacado)
                    const docNumDisplay = String(data.docNumber || '7195');
                    doc.text('Nº Documento: ', marginLeft + 415, subHeaderY)
                        .font('Helvetica-Bold').text(docNumDisplay, marginLeft + 480, subHeaderY);
                    return subHeaderY + 16;
                };
                // ==========================================
                // 3. TABELA DE CONFERÊNCIA (LARGURAS E ESTRUTURA)
                // ==========================================
                const colWidths = {
                    codigo: 44,
                    descricao: 165,
                    pedido: 48,
                    cliente: 194,
                    qtd: 38,
                    lote: contentWidth - (44 + 165 + 48 + 194 + 38), // ~66.28 pt
                };
                const colX = {
                    codigo: marginLeft,
                    descricao: marginLeft + colWidths.codigo,
                    pedido: marginLeft + colWidths.codigo + colWidths.descricao,
                    cliente: marginLeft + colWidths.codigo + colWidths.descricao + colWidths.pedido,
                    qtd: marginLeft + colWidths.codigo + colWidths.descricao + colWidths.pedido + colWidths.cliente,
                    lote: marginLeft + colWidths.codigo + colWidths.descricao + colWidths.pedido + colWidths.cliente + colWidths.qtd,
                };
                const drawTableHeader = (y) => {
                    // Cabeçalho preto com texto branco em negrito
                    doc.rect(marginLeft, y, contentWidth, 14).fill('#000000');
                    doc.fillColor('#ffffff').fontSize(7.5).font('Helvetica-Bold');
                    doc.text('CÓDIGO', colX.codigo + 4, y + 3.5, { width: colWidths.codigo - 8 });
                    doc.text('DESCRIÇÃO', colX.descricao + 4, y + 3.5, { width: colWidths.descricao - 8 });
                    doc.text('PEDIDO', colX.pedido, y + 3.5, { width: colWidths.pedido, align: 'center' });
                    doc.text('CLIENTE', colX.cliente + 4, y + 3.5, { width: colWidths.cliente - 8 });
                    doc.text('QTD', colX.qtd, y + 3.5, { width: colWidths.qtd, align: 'center' });
                    doc.text('LOTE', colX.lote, y + 3.5, { width: colWidths.lote, align: 'center' });
                };
                let currentY = drawHeader(20);
                drawTableHeader(currentY);
                currentY += 14;
                const groups = data.productGroups || [];
                for (const group of groups) {
                    // Para cada produto e cada cliente, calcula a altura necessária
                    for (let cIdx = 0; cIdx < group.clients.length; cIdx++) {
                        const client = group.clients[cIdx];
                        const clientLabel = `${client.cardCode} - ${client.cardName}`;
                        const docNumLabel = `#${client.docNum}`;
                        // Mede a altura necessária para evitar sobreposição de textos
                        doc.fontSize(7).font('Helvetica');
                        const descHeight = doc.heightOfString(group.itemDescription, { width: colWidths.descricao - 8 });
                        const clientHeight = doc.heightOfString(clientLabel, { width: colWidths.cliente - 8 });
                        const contentH = Math.max(descHeight, clientHeight);
                        const rowHeight = Math.max(16, contentH + 6);
                        // Quebra de página se exceder o limite
                        if (currentY + rowHeight + 20 > pageBottom) {
                            doc.addPage();
                            currentY = 20;
                            drawTableHeader(currentY);
                            currentY += 14;
                        }
                        // Retângulo delimitador da linha da tabela
                        doc.rect(marginLeft, currentY, contentWidth, rowHeight).lineWidth(0.5).strokeColor('#000000').stroke();
                        // Linhas verticais separadoras
                        doc.moveTo(colX.descricao, currentY).lineTo(colX.descricao, currentY + rowHeight).stroke();
                        doc.moveTo(colX.pedido, currentY).lineTo(colX.pedido, currentY + rowHeight).stroke();
                        doc.moveTo(colX.cliente, currentY).lineTo(colX.cliente, currentY + rowHeight).stroke();
                        doc.moveTo(colX.qtd, currentY).lineTo(colX.qtd, currentY + rowHeight).stroke();
                        doc.moveTo(colX.lote, currentY).lineTo(colX.lote, currentY + rowHeight).stroke();
                        doc.fillColor('#000000').fontSize(7).font('Helvetica');
                        // Código do Item (centralizado verticalmente)
                        doc.text(group.itemCode, colX.codigo + 3, currentY + (rowHeight - 7) / 2, {
                            width: colWidths.codigo - 6,
                            lineBreak: false,
                        });
                        // Descrição do Item (com centralização vertical automática)
                        const descTop = currentY + (rowHeight - descHeight) / 2;
                        doc.text(group.itemDescription, colX.descricao + 4, descTop, {
                            width: colWidths.descricao - 8,
                            lineGap: 1,
                        });
                        // Pedido SAP (#DocNum em negrito)
                        doc.font('Helvetica-Bold');
                        doc.text(docNumLabel, colX.pedido, currentY + (rowHeight - 7) / 2, {
                            width: colWidths.pedido,
                            align: 'center',
                        });
                        // Cliente (Código - Nome)
                        doc.font('Helvetica');
                        const clientTop = currentY + (rowHeight - clientHeight) / 2;
                        doc.text(clientLabel, colX.cliente + 4, clientTop, {
                            width: colWidths.cliente - 8,
                            lineGap: 1,
                        });
                        // Quantidade (centralizado verticalmente)
                        doc.text(String(client.quantity), colX.qtd, currentY + (rowHeight - 7) / 2, {
                            width: colWidths.qtd,
                            align: 'center',
                        });
                        // Lote permanece em branco para preenchimento manual / etiqueta
                        currentY += rowHeight;
                    }
                    // ==========================================
                    // 4. LINHA DE SUBTOTAL DA QUANTIDADE DO PRODUTO
                    // ==========================================
                    const subtotalHeight = 14;
                    if (currentY + subtotalHeight + 15 > pageBottom) {
                        doc.addPage();
                        currentY = 20;
                        drawTableHeader(currentY);
                        currentY += 14;
                    }
                    // Linhas e caixas do subtotal
                    const leftSpanWidth = colWidths.codigo + colWidths.descricao + colWidths.cliente;
                    // Fundo sutil para a linha de subtotal
                    doc.rect(marginLeft, currentY, contentWidth, subtotalHeight).fillAndStroke('#fafafa', '#000000');
                    // Linhas verticais para QTD e LOTE no subtotal
                    doc.moveTo(colX.qtd, currentY).lineTo(colX.qtd, currentY + subtotalHeight).stroke();
                    doc.moveTo(colX.lote, currentY).lineTo(colX.lote, currentY + subtotalHeight).stroke();
                    // Totalizador em negrito
                    doc.fillColor('#000000').fontSize(7.5).font('Helvetica-Bold');
                    doc.text(String(group.totalQuantity), colX.qtd, currentY + 3.5, {
                        width: colWidths.qtd,
                        align: 'center',
                    });
                    // Espaço sutil entre blocos de produtos diferentes
                    currentY += subtotalHeight + 4;
                }
                doc.end();
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
