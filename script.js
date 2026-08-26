const VERSION_APP = "v2.10-LAYOUT-SY-PLAN";
const GITHUB_BASE_URL = "https://raw.githubusercontent.com/lebob18-ux/MIGNATURE_K1/main/";
const GITHUB_IMG_URL = GITHUB_BASE_URL + "IMG_JPG/";

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    let btn = document.getElementById('btnInstaller');
    if (btn) btn.style.display = 'block';
});

let cataloguePlanGlobal = [];
let catalogueSymboleGlobal = [];
let stockGlobal = [];
let articleCourant = null;
let contexteMouvement = null;

function masquerLoader() {
    let loader = document.getElementById('loaderGlobal');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.3s ease';
        setTimeout(() => loader.remove(), 300);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    console.log(`%c[VERSION ACTIVE] : ${VERSION_APP}`, "background: #222; color: #bada55; padding: 4px; font-size: 14px; font-weight: bold;");
    
    let bannerVersion = document.createElement('div');
    bannerVersion.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; background: #28a745; color: white; text-align: center; padding: 6px; font-size: 12px; font-weight: bold; z-index: 99999;";
    bannerVersion.innerHTML = `TEST ACTIF : ${VERSION_APP} <span style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px; margin-left: 10px; cursor: pointer;" onclick="this.parentElement.remove()">Fermer [X]</span>`;
    document.body.prepend(bannerVersion);

    // 🛠️ Masquer le champ repère s'il existe dans le DOM
    let inputRep = document.getElementById('inputRep');
    if (inputRep && inputRep.parentElement) {
        inputRep.parentElement.style.display = 'none';
    }

    Promise.all([
        fetch(GITHUB_BASE_URL + 'PELICAN1.xlsx').then(res => res.arrayBuffer()).then(buffer => {
            let workbook = XLSX.read(buffer, { type: 'array' });
            let donneesBrutes = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            return donneesBrutes.filter(row => row && row.PLAN !== undefined && String(row.PLAN).trim() !== "").map(row => ({
                pelican: String(row.PELICAN || "").trim(),
                plan: String(row.PLAN || "").trim(),
                rep: (String(row.REP || "").trim() === "" || String(row.REP || "").trim() === "******") ? "000000" : String(row.REP || "").trim(),
                intitule: String(row.INT_PLAN || "").trim(),
                symbole: String(row.SYMBOLE_ECLATE || "").trim(),
                quantite: parseInt(row.QUANTITE) || 1,
                designation: String(row.DESIGNATION || "").trim()
            }));
        }).catch(() => []),
        fetch(GITHUB_BASE_URL + 'mapping.json').then(res => res.json()).catch(() => []),
        Promise.resolve(localStorage.getItem('stock_local_sauvegarde'))
    ]).then(([planData, symboleData, stockSauvegarde]) => {
        cataloguePlanGlobal = planData || [];
        catalogueSymboleGlobal = symboleData || [];
        if (stockSauvegarde) stockGlobal = JSON.parse(stockSauvegarde);
    }).finally(() => {
        masquerLoader();
    });

    setTimeout(() => {
        masquerLoader();
    }, 4000);

    // Écouteur de recherche Plan
    document.getElementById('inputPlan')?.addEventListener('input', () => { 
        let inputSym = document.getElementById('inputSymbole');
        if (inputSym && document.activeElement === inputSym && inputSym.value) {
            inputSym.value = '';
        }
        afficherSuggestionsPlan(); 
    });

    // Écouteur de recherche par Symbole (avec miniatures intégrées dans la liste)
    document.getElementById('inputSymbole')?.addEventListener('input', (e) => {
        let val = e.target.value.toLowerCase().trim();
        let container = document.getElementById('suggestions');
        if (!container) return;
        container.innerHTML = '';
        if (val.length < 1) return;

        let inputPln = document.getElementById('inputPlan');
        if (inputPln) inputPln.value = '';

        let matches = catalogueSymboleGlobal.filter(item => 
            String(item.symbole || "").toLowerCase().includes(val) || 
            String(item.designation || "").toLowerCase().includes(val)
        ).slice(0, 10);

        if (matches.length === 0) {
            container.innerHTML = '<div style="padding: 8px; color: #777; font-size: 13px; background: white; border: 1px solid #ddd;">Aucun symbole trouvé</div>';
            return;
        }

        let wrapper = document.createElement('div');
        wrapper.style.cssText = "background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 250px; overflow-y: auto; position: absolute; z-index: 1000; width: 100%;";
        
        matches.forEach(symItem => {
            let div = document.createElement('div');
            div.style.cssText = "padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 10px;";
            
            let imgUrl = `${GITHUB_IMG_URL}${symItem.symbole}.jpg`;
            div.innerHTML = `
                <img src="${imgUrl}" style="width: 45px; height: 35px; object-fit: contain; border: 1px solid #ddd; background: #fff;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2245%22 height=%2235%22%3E%3Crect width=%2245%22 height=%2235%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%228%22 fill=%22%23999%22%3ENo%3C/text%3E%3C/svg%3E'">
                <div>
                    <strong>SY : ${symItem.symbole}</strong><br><small style="color: #555;">${symItem.designation || 'Sans désignation'}</small>
                </div>
            `;
            
            div.addEventListener('click', () => {
                document.getElementById('inputSymbole').value = symItem.symbole;
                container.innerHTML = '';

                let inputPln = document.getElementById('inputPlan');
                if (inputPln) inputPln.value = '';

                let correspondancePlan = cataloguePlanGlobal.find(p => 
                    String(p.symbole || "").trim().toLowerCase() === String(symItem.symbole || "").trim().toLowerCase()
                );

                if (correspondancePlan) {
                    afficherFiche(correspondancePlan);
                } else {
                    afficherFicheSymboleSeul(symItem);
                }
            });
            wrapper.appendChild(div);
        });
        container.appendChild(wrapper);
    });
});

function afficherSuggestionsPlan() {
    let container = document.getElementById('listePlanResultats');
    if (!container) return;
    container.innerHTML = '';
    let recherchePlan = document.getElementById('inputPlan').value.toLowerCase().trim();
    if (!recherchePlan) return;

    let matches = cataloguePlanGlobal.filter(item => {
        let p = String(item.plan || "").toLowerCase().trim().replace(/^0+/, '');
        return p.includes(recherchePlan.replace(/^0+/, ''));
    });

    let resultatsUniques = [...new Map(matches.map(item => [item.plan + "_" + item.rep, item])).values()].slice(0, 10);
    if (resultatsUniques.length === 0) {
        container.innerHTML = '<div style="padding: 8px; color: #777; font-size: 13px; background: white; border: 1px solid #ddd;">Aucun résultat</div>';
        return;
    }

    let wrapper = document.createElement('div');
    wrapper.style.cssText = "background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 250px; overflow-y: auto; position: absolute; z-index: 1000; width: 100%;";
    resultatsUniques.forEach(article => {
        let div = document.createElement('div');
        div.style.cssText = "padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 14px;";
        div.innerHTML = `<strong>Plan : ${article.plan}</strong> | Rep : ${article.rep === "000000" ? "Sans repère" : article.rep}<br><small>${article.intitule}</small>`;
        div.addEventListener('click', () => {
            document.getElementById('inputPlan').value = article.plan;
            let inputSym = document.getElementById('inputSymbole');
            if (inputSym) inputSym.value = ''; 
            container.innerHTML = '';
            afficherFiche(article);
        });
        wrapper.appendChild(div);
    });
    container.appendChild(wrapper);
}

function afficherFiche(article) {
    articleCourant = article;
    document.getElementById('resPlan').textContent = article.plan || '-';
    document.getElementById('resRep').textContent = article.rep === "000000" ? "Sans repère" : (article.rep || '-');
    document.getElementById('resIntitule').textContent = article.intitule || '-';

    let img = document.getElementById('imgPiece');
    let plan6 = String(article.plan).trim().padStart(6, '0');
    let repClean = (article.rep && article.rep !== "000000") ? String(article.rep).trim().padStart(6, '0') : "000000";
    img.src = `${GITHUB_IMG_URL}${plan6}-${repClean}.jpg`;
    img.onerror = () => { img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22200%22%3E%3Crect width=%22320%22 height=%22200%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23aaa%22%3EImage introuvable%3C/text%3E%3C/svg%3E'; };

    // --- LIEUX DE STOCK PLAN-REP ---
    let existantsPlanRep = stockGlobal.filter(item => 
        String(item.plan || "").trim() === String(article.plan || "").trim() &&
        String(item.rep || "").trim() === String(article.rep || "").trim() &&
        (!item.symbole || item.symbole === "")
    );

    let divStock = document.getElementById('infoStockActuel');
    divStock.style.display = 'block';
    
    let htmlStock = `<div style="background: #f8f9fa; border: 1px solid #ccc; padding: 10px; border-radius: 6px;">`;
    htmlStock += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="font-size: 13px; color: #0056b3;">📦 Emplacements Stock Plan-Repère :</strong>
                    <button type="button" onclick="ouvrirModalPlanRep(null)" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">➕ Ajouter Stock</button>
                  </div>`;

    if (existantsPlanRep.length > 0) {
        existantsPlanRep.forEach(ex => {
            htmlStock += `<div onclick='ouvrirModalPlanRep(${JSON.stringify(ex)})' style="cursor: pointer; background: #d4edda; border: 1px solid #c3e6cb; padding: 6px; border-radius: 4px; font-size: 12px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
                <div>📍 Site: <b>${ex.site}</b> | Bât: <b>${ex.batiment}</b> | Rang: <b>${ex.rang}</b></div>
                <div style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Qte: ${ex.quantite}</div>
            </div>`;
        });
    } else {
        htmlStock += `<div style="font-size: 12px; color: #856404; font-style: italic;">Aucun stock enregistré. Cliquez sur "Ajouter Stock" pour créer un emplacement.</div>`;
    }
    htmlStock += `</div>`;
    divStock.innerHTML = htmlStock;

    // --- BLOC ÉCLATÉ (SY) ---
    let conteneurComposants = document.getElementById('resSymbole');
    conteneurComposants.innerHTML = '';

    let boutonToggle = document.createElement('button');
    boutonToggle.style.cssText = "width: 100%; background-color: #6c757d; color: white; border: none; padding: 10px; font-size: 13px; border-radius: 4px; cursor: pointer; font-weight: bold;";
    boutonToggle.innerHTML = "🔍 Afficher la composition éclatée (SY) & stocks";

    let contenuEclate = document.createElement('div');
    contenuEclate.style.cssText = "display: none; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 10px;";

    let composantsPlan = cataloguePlanGlobal.filter(item => {
        let matchPlan = String(item.plan || "").trim() === String(article.plan || "").trim();
        let matchRep = article.rep ? (String(item.rep || "").trim() === String(article.rep || "").trim()) : true;
        let estEnsembleComplet = String(item.symbole || "").trim() === "" || String(item.symbole || "").trim() === "0";
        return matchPlan && matchRep && !estEnsembleComplet;
    });

    if (composantsPlan.length === 0) {
        contenuEclate.innerHTML = '<div style="font-size: 13px; color: #666; font-style: italic;">Aucun sous-symbole éclaté.</div>';
    } else {
        composantsPlan.forEach(c => {
            let stockSy = stockGlobal.filter(s => String(s.plan || "").trim() === String(c.plan || "").trim() && String(s.symbole || "").trim().toLowerCase() === String(c.symbole || "").trim().toLowerCase());

            let row = document.createElement('div');
            row.style.cssText = "background: #fff; border: 1px solid #ced4da; padding: 8px; border-radius: 6px; margin-bottom: 8px;";
            
            let infoSymboleJson = catalogueSymboleGlobal.find(s => String(s.symbole || "").trim().toLowerCase() === String(c.symbole || "").trim().toLowerCase());
            let designationSymbole = infoSymboleJson ? (infoSymboleJson.designation || c.intitule) : (c.designation || c.intitule);

            let htmlSy = `<div style="display: flex; gap: 8px; align-items: center;">
                <img src="${GITHUB_IMG_URL}${c.symbole}.jpg" style="width: 60px; height: 45px; object-fit: contain; border: 1px solid #ccc; background: #fff;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2245%22%3E%3Crect width=%2260%22 height=%2245%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%229%22 fill=%22%23999%22%3ENo img%3C/text%3E%3C/svg%3E'">
                <div style="flex-grow: 1; font-size: 12px;">
                    <strong style="color: #0056b3;">SY : ${c.symbole}</strong> | Requis : <b>${c.quantite}</b><br><span style="color: #444;">${designationSymbole}</span>
                </div>
            </div>`;

            if (stockSy.length > 0) {
                htmlSy += `<div style="margin-top: 6px; border-top: 1px solid #eee; padding-top: 4px;">`;
                stockSy.forEach(st => {
                    htmlSy += `<div onclick='ouvrirModalSortieSy(${JSON.stringify(c)}, ${JSON.stringify(st)})' style="cursor: pointer; background: #d4edda; border: 1px solid #c3e6cb; padding: 5px; border-radius: 4px; font-size: 11px; margin-top: 3px; display: flex; justify-content: space-between; align-items: center;">
                        <span>📍 <b>${st.site}</b> / ${st.batiment} / ${st.rang} (<b>Stock: ${st.quantite}</b>)</span>
                        <span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">➖ Sortie</span>
                    </div>`;
                });
                htmlSy += `</div>`;
            } else {
                htmlSy += `<div style="margin-top: 6px; font-size: 11px; color: #856404; background: #fff3cd; padding: 4px; border-radius: 4px;">⚠️ Aucun stock pour ce composant SY</div>`;
            }
            row.innerHTML = htmlSy;
            contenuEclate.appendChild(row);
        });
    }

    boutonToggle.addEventListener('click', () => {
        let isOpen = contenuEclate.style.display === 'block';
        contenuEclate.style.display = isOpen ? 'none' : 'block';
        boutonToggle.innerHTML = isOpen ? "🔍 Afficher la composition éclatée (SY) & stocks" : "🔍 Masquer la composition éclatée (SY)";
    });

    conteneurComposants.appendChild(boutonToggle);
    conteneurComposants.appendChild(contenuEclate);
    document.getElementById('resultat').style.display = 'block';
}

function afficherFicheSymboleSeul(symItem) {
    articleCourant = { plan: "SYMB", rep: "000000", intitule: symItem.designation || symItem.symbole };
    document.getElementById('resPlan').textContent = "SYMB";
    document.getElementById('resRep').textContent = symItem.symbole;
    document.getElementById('resIntitule').textContent = symItem.designation || "Symbole issu du mapping";

    let img = document.getElementById('imgPiece');
    img.src = `${GITHUB_IMG_URL}${symItem.symbole}.jpg`;
    img.onerror = () => { img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22200%22%3E%3Crect width=%22320%22 height=%22200%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23aaa%22%3EImage introuvable%3C/text%3E%3C/svg%3E'; };

    document.getElementById('infoStockActuel').style.display = 'none';
    document.getElementById('resSymbole').innerHTML = '<div style="font-size: 13px; color: #666; font-style: italic; padding: 8px;">Recherche par symbole direct (pas de plan rattaché).</div>';
    document.getElementById('resultat').style.display = 'block';
}

// --- GESTION DE LA MODALE ---
function ouvrirModalPlanRep(existant) {
    contexteMouvement = { type: 'PLAN_REP', donnees: existant };
    document.getElementById('modalTitre').textContent = existant ? "Modifier stock Plan-Repère" : "Ajouter stock Plan-Repère";
    document.getElementById('modalSousTitre').textContent = `Plan : ${articleCourant.plan} | Rep : ${articleCourant.rep}`;
    document.getElementById('divTypeMvt').style.display = 'block';
    
    document.getElementById('mouvementType').value = 'ENTREE';
    document.getElementById('stockSite').value = existant ? existant.site : '';
    document.getElementById('stockBatiment').value = existant ? existant.batiment : '';
    document.getElementById('stockRang').value = existant ? existant.rang : '';
    document.getElementById('stockQuantite').value = '1';

    document.getElementById('modalOverlay').style.display = 'flex';
}

function ouvrirModalSortieSy(composant, stockItem) {
    contexteMouvement = { type: 'SY_SORTIE', composant: composant, stockItem: stockItem };
    document.getElementById('modalTitre').textContent = `Sortie Composant SY : ${composant.symbole}`;
    document.getElementById('modalSousTitre').textContent = `Emplacement : ${stockItem.site} / ${stockItem.batiment} / ${stockItem.rang} (Dispo: ${stockItem.quantite})`;
    document.getElementById('divTypeMvt').style.display = 'none';

    document.getElementById('stockSite').value = stockItem.site;
    document.getElementById('stockBatiment').value = stockItem.batiment;
    document.getElementById('stockRang').value = stockItem.rang;
    document.getElementById('stockQuantite').value = '1';

    document.getElementById('modalOverlay').style.display = 'flex';
}

function fermerModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    contexteMouvement = null;
}

function validerMouvementStock() {
    if (!contexteMouvement || !articleCourant) return;

    let qte = parseInt(document.getElementById('stockQuantite').value) || 0;
    if (qte <= 0) { alert("Quantité invalide"); return; }

    if (contexteMouvement.type === 'PLAN_REP') {
        let typeMvt = document.getElementById('mouvementType').value;
        let site = document.getElementById('stockSite').value.trim();
        let batiment = document.getElementById('stockBatiment').value.trim();
        let rang = document.getElementById('stockRang').value.trim();

        if (!site || !batiment || !rang) { alert("Remplissez tous les champs d'emplacement."); return; }

        let index = stockGlobal.findIndex(item =>
            String(item.plan || "").trim() === String(articleCourant.plan || "").trim() &&
            String(item.rep || "").trim() === String(articleCourant.rep || "").trim() &&
            (!item.symbole || item.symbole === "") &&
            String(item.site || "").toLowerCase() === site.toLowerCase() &&
            String(item.batiment || "").toLowerCase() === batiment.toLowerCase() &&
            String(item.rang || "").toLowerCase() === rang.toLowerCase()
        );

        if (typeMvt === 'ENTREE') {
            if (index !== -1) stockGlobal[index].quantite = (parseInt(stockGlobal[index].quantite) || 0) + qte;
            else stockGlobal.push({ plan: articleCourant.plan, rep: articleCourant.rep, symbole: "", intitule: articleCourant.intitule, site, batiment, rang, quantite: qte });
        } else {
            if (index === -1 || (parseInt(stockGlobal[index].quantite) || 0) < qte) { alert("Stock insuffisant ou emplacement introuvable."); return; }
            stockGlobal[index].quantite -= qte;
        }
    } else if (contexteMouvement.type === 'SY_SORTIE') {
        let comp = contexteMouvement.composant;
        let stItem = contexteMouvement.stockItem;

        let index = stockGlobal.findIndex(item =>
            String(item.plan || "").trim() === String(comp.plan || "").trim() &&
            String(item.symbole || "").trim().toLowerCase() === String(comp.symbole || "").trim().toLowerCase() &&
            String(item.site || "").toLowerCase() === String(stItem.site || "").toLowerCase() &&
            String(item.batiment || "").toLowerCase() === String(stItem.batiment || "").toLowerCase() &&
            String(item.rang || "").toLowerCase() === String(stItem.rang || "").toLowerCase()
        );

        if (index === -1 || (parseInt(stockGlobal[index].quantite) || 0) < qte) { alert("Stock insuffisant pour ce composant SY !"); return; }
        stockGlobal[index].quantite -= qte;
    }

    localStorage.setItem('stock_local_sauvegarde', JSON.stringify(stockGlobal));
    fermerModal();
    afficherFiche(articleCourant);
    alert("✅ Mouvement enregistré avec succès !");
}

function exporterStockCSV() {
    if (stockGlobal.length === 0) { alert("Aucun stock à exporter."); return; }
    let csv = "Plan;Rep;Symbole;Intitule;Site;Batiment;Rang;Quantite\n";
    stockGlobal.forEach(i => { csv += `${i.plan || ""};${i.rep === "000000" ? "" : (i.rep || "")};${i.symbole || ""};"${(i.intitule || "").replace(/"/g, '""')}";${i.site || ""};${i.batiment || ""};${i.rang || ""};${i.quantite || 0}\n`; });
    let link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    link.download = "stock_terrain_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
