const VERSION_APP = "20-ENSEMBLE-SY-20-20";
const GITHUB_BASE_URL = "https://raw.githubusercontent.com/lebob18-ux/MIGNATURE_K1/main/";
const GITHUB_IMG_URL = GITHUB_BASE_URL + "IMG_JPG/";

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    let btn = document.getElementById('btnInstaller');
    if (btn) btn.style.display = 'block';
});

function installerApplication() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('Utilisateur a accepté l\'installation PWA');
        }
        deferredPrompt = null;
        let btn = document.getElementById('btnInstaller');
        if (btn) btn.style.display = 'none';
    });
}

let cataloguePlanGlobal = [];
let catalogueSymboleGlobal = [];
let stockGlobal = [];
let articleCourant = null;
let contexteMouvement = null;

let dernierSiteSaisi = '';
let dernierBatimentSaisi = '';

function masquerLoader() {
    let loader = document.getElementById('loaderGlobal');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.3s ease';
        setTimeout(() => loader.remove(), 300);
    }
}

function reinitialiserFicheEtSaisies() {
    articleCourant = null;
    let resDiv = document.getElementById('resultat');
    if (resDiv) resDiv.style.display = 'none';

    let img = document.getElementById('imgPiece');
    if (img) img.src = '';

    let resPlan = document.getElementById('resPlan');
    if (resPlan) resPlan.textContent = '-';
    let resRep = document.getElementById('resRep');
    if (resRep) resRep.textContent = '-';
    let resIntitule = document.getElementById('resIntitule');
    if (resIntitule) resIntitule.textContent = '-';
    let divStock = document.getElementById('infoStockActuel');
    if (divStock) divStock.innerHTML = '';
    let conteneurComposants = document.getElementById('resSymbole');
    if (conteneurComposants) conteneurComposants.innerHTML = '';
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(masquerLoader, 2500);

    console.log(`%c[VERSION ACTIVE] : ${VERSION_APP}`, "background: #222; color: #bada55; padding: 4px; font-size: 14px; font-weight: bold;");
    
    let bannerVersion = document.createElement('div');
    bannerVersion.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; background: #28a745; color: white; text-align: center; padding: 6px; font-size: 12px; font-weight: bold; z-index: 99999;";
    bannerVersion.innerHTML = `TEST ACTIF : ${VERSION_APP} <span style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px; margin-left: 10px; cursor: pointer;" onclick="this.parentElement.remove()">Fermer [X]</span>`;
    document.body.prepend(bannerVersion);

    let inputRep = document.getElementById('inputRep');
    if (inputRep && inputRep.parentElement) {
        inputRep.parentElement.style.display = 'none';
    }

    ['inputPlan', 'inputSymbole', 'stockSite', 'stockBatiment', 'stockRang', 'stockQuantite'].forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            el.addEventListener('focus', function() { this.select(); });
        }
    });

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

    document.getElementById('inputPlan')?.addEventListener('input', () => { 
        reinitialiserFicheEtSaisies();
        let inputSym = document.getElementById('inputSymbole');
        if (inputSym) inputSym.value = '';
        afficherSuggestionsPlan(); 
    });

    document.getElementById('inputSymbole')?.addEventListener('input', (e) => {
        reinitialiserFicheEtSaisies();
        let val = e.target.value.toLowerCase().trim();
        let container = document.getElementById('suggestions');
        if (!container) return;
        container.innerHTML = '';
        if (val.length < 1) return;

        let inputPln = document.getElementById('inputPlan');
        if (inputPln) inputPln.value = '';


let matchesSym = catalogueSymboleGlobal.filter(item => 
            String(item.symbole || "").toLowerCase().includes(val) || 
            String(item.plan || "").toLowerCase().includes(val) || 
            String(item.designation || "").toLowerCase().includes(val)
        ).map(item => {
            // Recherche de l'intitulé spécifique propre à ce SY dans le catalogue des plans ou le JSON
            let correspondancePlan = cataloguePlanGlobal.find(p => String(p.symbole || "").trim().toLowerCase() === String(item.symbole || "").trim().toLowerCase());
            let intituleSyPropre = (correspondancePlan ? correspondancePlan.designation : "") || item.designation || item.intitule || 'Sans désignation';

            return {
                type: 'SYM',
                titre: `SY : ${item.symbole}`,
                sousTitre: intituleSyPropre,
                codeImage: item.symbole,
                planAssocie: item.plan,
                donneeBrute: { ...item, designation: intituleSyPropre }
            };
        });




        
        let matches = matchesSym.slice(0, 10);

        if (matches.length === 0) {
            container.innerHTML = '<div style="padding: 10px; color: #777; font-size: 13px; background: white; border: 1px solid #ddd; border-radius: 4px;">Aucun résultat trouvé dans le JSON</div>';
            return;
        }

        let wrapper = document.createElement('div');
        wrapper.style.cssText = "background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 280px; overflow-y: auto; position: absolute; z-index: 1000; left: 0; right: 0; box-shadow: 0 4px 8px rgba(0,0,0,0.15);";
        
        matches.forEach(match => {
            let div = document.createElement('div');
            div.style.cssText = "padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 12px;";
            
            let imgUrl = `${GITHUB_IMG_URL}${match.codeImage}.jpg`;

            div.innerHTML = `
                <img src="${imgUrl}" style="width: 60px; height: 45px; object-fit: contain; border: 1px solid #ddd; background: #fff; flex-shrink: 0;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2245%22%3E%3Crect width=%2260%22 height=%2245%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%229%22 fill=%22%23999%22%3ENo%3C/text%3E%3C/svg%3E'">
                <div style="flex-grow: 1;">
                    <strong style="font-size: 14px; color: #0056b3;">${match.titre}</strong><br><small style="color: #555; font-size: 12px;">${match.sousTitre}</small>
                </div>
            `;
            
            div.addEventListener('click', () => {
                container.innerHTML = '';
                let inputPln = document.getElementById('inputPlan');
                if (inputPln) inputPln.value = '';

                document.getElementById('inputSymbole').value = match.donneeBrute.symbole;
                afficherFicheSymboleSeul(match.donneeBrute);
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
        container.innerHTML = '<div style="padding: 10px; color: #777; font-size: 13px; background: white; border: 1px solid #ddd; border-radius: 4px;">Aucun résultat Pelican</div>';
        return;
    }

    let wrapper = document.createElement('div');
    wrapper.style.cssText = "background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 280px; overflow-y: auto; position: absolute; z-index: 1000; left: 0; right: 0; box-shadow: 0 4px 8px rgba(0,0,0,0.15);";
    
    resultatsUniques.forEach(article => {
        let div = document.createElement('div');
        div.style.cssText = "padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 14px;";
        div.innerHTML = `<strong>Plan : ${article.plan}</strong> | Rep : ${article.rep === "000000" ? "Sans repère" : article.rep}<br><small style="color: #555;">${article.intitule}</small>`;
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
    img.src = `${GITHUB_IMG_URL}${plan6}.jpg`;
    img.onerror = () => { img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22200%22%3E%3Crect width=%22320%22 height=%22200%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23aaa%22%3EImage introuvable%3C/text%3E%3C/svg%3E'; };

    let existantsPlanRep = stockGlobal.filter(item => 
        String(item.plan || "").trim() === String(article.plan || "").trim() &&
        String(item.rep || "").trim() === String(article.rep || "").trim() &&
        (!item.symbole || item.symbole === "")
    );

    let divStock = document.getElementById('infoStockActuel');
    divStock.style.display = 'block';
    
    let htmlStock = `<div style="background: #f8f9fa; border: 1px solid #ccc; padding: 10px; border-radius: 6px;">`;
    htmlStock += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="font-size: 13px; color: #0056b3;">📦 Emplacements Stock Ensemble :</strong>
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
        htmlStock += `<div style="font-size: 12px; color: #856404; font-style: italic;">Aucun stock enregistré. Cliquez sur "Ajouter Stock".</div>`;
    }
    htmlStock += `</div>`;
    divStock.innerHTML = htmlStock;

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
            let intituleSy = (infoSymboleJson ? (infoSymboleJson.designation || infoSymboleJson.intitule) : "") || c.designation || "Sans intitulé";

            let htmlSy = `<div style="display: flex; gap: 8px; align-items: center;">
                <img src="${GITHUB_IMG_URL}${c.symbole}.jpg" onclick='afficherFicheSymboleSeul(${JSON.stringify(infoSymboleJson || {symbole: c.symbole, plan: c.plan, designation: intituleSy})})' style="width: 80px; height: 60px; object-fit: contain; border: 1px solid #ccc; background: #fff; cursor: pointer;" title="Voir la fiche de ce symbole" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2245%22%3E%3Crect width=%2260%22 height=%2245%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%229%22 fill=%22%23999%22%3ENo img%3C/text%3E%3C/svg%3E'">
                <div style="flex-grow: 1; font-size: 12px;">
                    <strong style="color: #0056b3;">N° SY : ${c.symbole}</strong> | Plan : <b>${c.plan}</b> | Requis : <b>${c.quantite}</b><br>
                    <span style="color: #222; font-weight: 600;">Intitulé : ${intituleSy}</span>
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
    let correspondanceExcel = cataloguePlanGlobal.find(item => 
        String(item.symbole || "").trim().toLowerCase() === String(symItem.symbole || "").trim().toLowerCase()
    );

    let numPlan = correspondanceExcel ? correspondanceExcel.plan : (symItem.planAssocie || "-");
    let numSy = symItem.symbole || "-";
    let intituleTexte = correspondanceExcel ? correspondanceExcel.intitule : (symItem.designation || symItem.intitule || "Sans intitulé");

    articleCourant = { plan: numPlan, rep: numSy, intitule: intituleTexte, symbole: numSy };
    
    let elPlan = document.getElementById('resPlan');
    if (elPlan) elPlan.textContent = numPlan;

    let elRep = document.getElementById('resRep');
    if (elRep) elRep.textContent = numSy;

    let elIntitule = document.getElementById('resIntitule');
    if (elIntitule) elIntitule.textContent = intituleTexte;

    let img = document.getElementById('imgPiece');
    if (img) {
        img.src = `${GITHUB_IMG_URL}${numSy}.jpg`;
        img.onerror = () => { 
            img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22200%22%3E%3Crect width=%22320%22 height=%22200%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23aaa%22%3EMiniature introuvable%3C/text%3E%3C/svg%3E'; 
        };
    }

    let existantsSym = stockGlobal.filter(item => 
        String(item.symbole || "").trim().toLowerCase() === String(numSy || "").trim().toLowerCase() &&
        (!item.plan || item.plan === "SYMB" || item.plan === numPlan)
    );

    let divStock = document.getElementById('infoStockActuel');
    if (divStock) {
        divStock.style.display = 'block';
        let htmlStock = `<div style="background: #f8f9fa; border: 1px solid #ccc; padding: 10px; border-radius: 6px;">`;
        htmlStock += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <strong style="font-size: 13px; color: #0056b3;">📦 Emplacements Stock Symbole :</strong>
                        <button type="button" onclick="ouvrirModalStockSymbole(null)" style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">➕ Ajouter Stock</button>
                      </div>`;

        if (existantsSym.length > 0) {
            existantsSym.forEach(ex => {
                htmlStock += `<div onclick='ouvrirModalStockSymbole(${JSON.stringify(ex)})' style="cursor: pointer; background: #d4edda; border: 1px solid #c3e6cb; padding: 6px; border-radius: 4px; font-size: 12px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <div>📍 Site: <b>${ex.site}</b> | Bât: <b>${ex.batiment}</b> | Rang: <b>${ex.rang}</b></div>
                    <div style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Qte: ${ex.quantite}</div>
                </div>`;
            });
        } else {
            htmlStock += `<div style="font-size: 12px; color: #856404; font-style: italic;">Aucun stock enregistré pour ce symbole. Cliquez sur "Ajouter Stock".</div>`;
        }
        htmlStock += `</div>`;
        divStock.innerHTML = htmlStock;
    }
    
    let conteneurComposants = document.getElementById('resSymbole');
    if (conteneurComposants) conteneurComposants.innerHTML = '';

    let resultatDiv = document.getElementById('resultat');
    if (resultatDiv) resultatDiv.style.display = 'block';
}

function ouvrirModalPlanRep(existant) {
    contexteMouvement = { type: 'PLAN_REP', donnees: existant };
    document.getElementById('modalTitre').textContent = existant ? "Modifier stock Ensemble" : "Ajouter stock Ensemble";
    document.getElementById('modalSousTitre').textContent = `Plan : ${articleCourant.plan} | Rep : ${articleCourant.rep}`;
    document.getElementById('divTypeMvt').style.display = 'block';
    
    document.getElementById('mouvementType').value = 'ENTREE';
    
    document.getElementById('stockSite').value = existant ? existant.site : (dernierSiteSaisi || '');
    document.getElementById('stockBatiment').value = existant ? existant.batiment : (dernierBatimentSaisi || '');
    document.getElementById('stockRang').value = existant ? existant.rang : '';
    document.getElementById('stockQuantite').value = '1';

    document.getElementById('modalOverlay').style.display = 'flex';
}

function ouvrirModalStockSymbole(existant) {
    contexteMouvement = { type: 'SYMBOLE_PUR', donnees: existant };
    document.getElementById('modalTitre').textContent = existant ? "Modifier stock Symbole" : "Ajouter stock Symbole";
    document.getElementById('modalSousTitre').textContent = `Symbole : ${articleCourant.symbole}`;
    document.getElementById('divTypeMvt').style.display = 'block';
    
    document.getElementById('mouvementType').value = 'ENTREE';
    
    document.getElementById('stockSite').value = existant ? existant.site : (dernierSiteSaisi || '');
    document.getElementById('stockBatiment').value = existant ? existant.batiment : (dernierBatimentSaisi || '');
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

    let site = document.getElementById('stockSite').value.trim();
    let batiment = document.getElementById('stockBatiment').value.trim();
    let rang = document.getElementById('stockRang').value.trim();

    if (!site || !batiment || !rang) { alert("Remplissez tous les champs d'emplacement."); return; }

    dernierSiteSaisi = site;
    dernierBatimentSaisi = batiment;

    if (contexteMouvement.type === 'PLAN_REP') {
        let typeMvt = document.getElementById('mouvementType').value;

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
    } else if (contexteMouvement.type === 'SYMBOLE_PUR') {
        let typeMvt = document.getElementById('mouvementType').value;

        let index = stockGlobal.findIndex(item =>
            String(item.symbole || "").trim().toLowerCase() === String(articleCourant.symbole || "").trim().toLowerCase() &&
            (!item.plan || item.plan === "SYMB" || item.plan === "") &&
            String(item.site || "").toLowerCase() === site.toLowerCase() &&
            String(item.batiment || "").toLowerCase() === batiment.toLowerCase() &&
            String(item.rang || "").toLowerCase() === rang.toLowerCase()
        );

        if (typeMvt === 'ENTREE') {
            if (index !== -1) stockGlobal[index].quantite = (parseInt(stockGlobal[index].quantite) || 0) + qte;
            else stockGlobal.push({ plan: "SYMB", rep: "", symbole: articleCourant.symbole, intitule: articleCourant.intitule, site, batiment, rang, quantite: qte });
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
    
    let inputPlan = document.getElementById('inputPlan');
    if (inputPlan) inputPlan.value = '';
    let inputSymbole = document.getElementById('inputSymbole');
    if (inputSymbole) inputSymbole.value = '';
    
    reinitialiserFicheEtSaisies();
    
    alert("✅ Mouvement enregistré avec succès !");
}

async function partagerStockSmartphone() {
    if (stockGlobal.length === 0) { alert("Aucun stock à partager."); return; }
    let csv = "Plan;Rep;Symbole;Intitule;Site;Batiment;Rang;Quantite\n";
    stockGlobal.forEach(i => { csv += `${i.plan || ""};${i.rep === "000000" ? "" : (i.rep || "")};${i.symbole || ""};"${(i.intitule || "").replace(/"/g, '""')}";${i.site || ""};${i.batiment || ""};${i.rang || ""};${i.quantite || 0}\n`; });

    let nomFichier = "stock_terrain_" + new Date().toISOString().slice(0, 10) + ".csv";

    if (navigator.share) {
        try {
            let fichier = new File([csv], nomFichier, { type: 'text/csv' });
            if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
                await navigator.share({
                    title: 'Export Stock Terrain',
                    text: 'Voici le fichier de stock exporté depuis l\'application.',
                    files: [fichier]
                });
                return;
            }
            await navigator.share({
                title: 'Export Stock Terrain',
                text: csv
            });
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.log("Partage annulé ou erreur :", error);
            }
        }
    } else {
        // Fallback téléchargement classique si PC
        let link = document.createElement("a");
        link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
        link.download = nomFichier;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
