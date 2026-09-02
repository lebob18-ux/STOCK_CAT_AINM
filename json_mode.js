if (typeof VERSION_APP_JSON === 'undefined') {
    var VERSION_APP_JSON = "JSON-ONGLET-V1";
}
// GITHUB_BASE_URL et GITHUB_IMG_URL sont déjà déclarés en const dans pelican.js
// on ne les redéclare pas ici pour éviter le SyntaxError

if (typeof catalogueSymboleGlobal === 'undefined') { var catalogueSymboleGlobal = []; }
if (typeof stockGlobalJson === 'undefined') { var stockGlobalJson = []; }
if (typeof articleCourantJson === 'undefined') { var articleCourantJson = null; }
if (typeof contexteMouvementJson === 'undefined') { var contexteMouvementJson = null; }
if (typeof dernierSiteSaisiJson === 'undefined') { var dernierSiteSaisiJson = ''; }
if (typeof dernierBatimentSaisiJson === 'undefined') { var dernierBatimentSaisiJson = ''; }

window.addEventListener('DOMContentLoaded', () => {
    console.log(`%c[JSON MODE] : ${VERSION_APP_JSON}`, "background: #28a745; color: white; padding: 4px; font-size: 14px; font-weight: bold;");

    ['inputSymboleJson', 'stockSiteJson', 'stockBatimentJson', 'stockRangJson', 'stockQuantiteJson'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.addEventListener('focus', function() { this.select(); });
    });

    let barre = document.getElementById('barreProgression');
    if (barre) barre.style.width = '60%';

    fetch(GITHUB_BASE_URL + 'mapping.json')
        .then(res => {
            if (!res.ok) throw new Error("Erreur réseau");
            return res.json();
        })
        .then(data => {
            catalogueSymboleGlobal = data || [];
            if (barre) barre.style.width = '100%';
            console.log("mapping.json chargé :", catalogueSymboleGlobal.length, "entrées.");
            
            // Lancement du téléchargement automatique de toutes les miniatures en arrière-plan
            prechargerToutesLesMiniatures();
            
            masquerLoaderGlobal();
        })
        .catch(err => {
            console.warn("⚠️ Impossible de charger mapping.json :", err);
            catalogueSymboleGlobal = [];
            if (barre) barre.style.width = '100%';
            masquerLoaderGlobal();
        });

    let stockSauvegarde = localStorage.getItem('stock_local_sauvegarde');
    if (stockSauvegarde) {
        try { stockGlobalJson = JSON.parse(stockSauvegarde); } catch(e) { stockGlobalJson = []; }
    }

    let inputSymbole = document.getElementById('inputSymboleJson');
    if (inputSymbole) {
        inputSymbole.addEventListener('input', (e) => {
            reinitialiserFicheJson();
            let val = e.target.value.toLowerCase().trim();
            let container = document.getElementById('suggestionsJson');
            if (!container) return;
            container.innerHTML = '';
            if (val.length < 1) return;

            let matches = catalogueSymboleGlobal.filter(item =>
                String(item.symbole || "").toLowerCase().includes(val) ||
                String(item.plan || "").toLowerCase().includes(val)
            ).slice(0, 10);

            if (matches.length === 0) {
                container.innerHTML = '<div style="padding: 10px; color: #777; font-size: 13px; background: white; border: 1px solid #ddd; border-radius: 4px;">Aucun résultat trouvé dans le JSON</div>';
                return;
            }

            let wrapper = document.createElement('div');
            wrapper.style.cssText = "background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 280px; overflow-y: auto; position: absolute; z-index: 1000; left: 0; right: 0; box-shadow: 0 4px 8px rgba(0,0,0,0.15);";

            matches.forEach(item => {
                let div = document.createElement('div');
                div.style.cssText = "padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 12px; background: white;";

                let imgUrl = `${GITHUB_IMG_URL}${item.symbole}.jpg`;
                div.innerHTML = `
                    <img src="${imgUrl}" style="width: 60px; height: 45px; object-fit: contain; border: 1px solid #ddd; background: #fff; flex-shrink: 0;"
                         onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2245%22%3E%3Crect width=%2260%22 height=%2245%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%229%22 fill=%22%23999%22%3ENo%3C/text%3E%3C/svg%3E'">
                    <div style="flex-grow: 1;">
                        <strong style="font-size: 14px; color: #0056b3;">SY : ${item.symbole}</strong> | Plan : ${item.plan || '-'}<br>
                        <span style="font-size: 12px; color: #222; font-weight: 600;">${item.intitule || 'Sans désignation'}</span>
                    </div>
                `;

                div.addEventListener('mouseover', () => div.style.background = '#f1f8ff');
                div.addEventListener('mouseout',  () => div.style.background = 'white');
                div.addEventListener('click', () => {
                    container.innerHTML = '';
                    document.getElementById('inputSymboleJson').value = item.symbole;
                    afficherFicheSymboleJson(item);
                });
                wrapper.appendChild(div);
            });
            container.appendChild(wrapper);
        });
    }
});

function prechargerToutesLesMiniatures() {
    if (!navigator.onLine) return; 

    console.log("📥 Démarrage du pré-chargement des miniatures en arrière-plan...");

    if (typeof catalogueSymboleGlobal !== 'undefined' && catalogueSymboleGlobal.length > 0) {
        catalogueSymboleGlobal.forEach((item, index) => {
            if (item.symbole) {
                let imgUrl = `${GITHUB_IMG_URL}${item.symbole}.jpg`;
                setTimeout(() => {
                    fetch(imgUrl, { mode: 'no-cors' }).catch(err => {});
                }, index * 50);
            }
        });
    }
}

function reinitialiserFicheJson() {
    articleCourantJson = null;
    let resDiv = document.getElementById('resultatJson');
    if (resDiv) resDiv.style.display = 'none';
    let img = document.getElementById('imgPieceJson');
    if (img) img.src = '';
    let resPlan = document.getElementById('resPlanJson');
    if (resPlan) resPlan.textContent = '-';
    let resRep = document.getElementById('resRepJson');
    if (resRep) resRep.textContent = '-';
    let resIntitule = document.getElementById('resIntituleJson');
    if (resIntitule) resIntitule.textContent = '-';
    let divStock = document.getElementById('infoStockActuelJson');
    if (divStock) divStock.innerHTML = '';
}

function afficherFicheSymboleJson(symItem) {
    articleCourantJson = symItem;

    let numPlan     = symItem.plan        || "-";
    let numSy       = symItem.symbole     || "-";
    let intituleTexte = symItem.intitule || "Sans intitulé";

    document.getElementById('resPlanJson').textContent     = `Plan : ${numPlan}`;
    document.getElementById('resRepJson').textContent      = `SY : ${numSy}`;
    document.getElementById('resIntituleJson').textContent = intituleTexte;

    let img = document.getElementById('imgPieceJson');
    if (img) {
        img.src = `${GITHUB_IMG_URL}${numSy}.jpg`;
        img.onerror = () => {
            img.onerror = null;
            img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22200%22%3E%3Crect width=%22320%22 height=%22200%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23aaa%22%3EMiniature introuvable%3C/text%3E%3C/svg%3E';
        };
    }

    let existantsSym = stockGlobalJson.filter(item =>
        String(item.symbole || "").trim().toLowerCase() === String(numSy || "").trim().toLowerCase() &&
        (!item.plan || item.plan === "SYMB" || item.plan === numPlan)
    );

    let divStock = document.getElementById('infoStockActuelJson');
    if (divStock) {
        divStock.style.display = 'block';
        divStock.innerHTML = '';

        let wrapper = document.createElement('div');
        wrapper.style.cssText = "background: #f8f9fa; border: 1px solid #ccc; padding: 10px; border-radius: 6px;";

        let entete = document.createElement('div');
        entete.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;";
        entete.innerHTML = `<strong style="font-size: 13px; color: #0056b3;">📦 Emplacements Stock Symbole :</strong>`;
        let btnAjouter = document.createElement('button');
        btnAjouter.type = 'button';
        btnAjouter.style.cssText = "background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;";
        btnAjouter.textContent = '➕ Ajouter Stock';
        btnAjouter.addEventListener('click', () => ouvrirModalStockSymboleJson(null));
        entete.appendChild(btnAjouter);
        wrapper.appendChild(entete);

        if (existantsSym.length > 0) {
            existantsSym.forEach(ex => {
                let ligne = document.createElement('div');
                ligne.style.cssText = "cursor: pointer; background: #d4edda; border: 1px solid #c3e6cb; padding: 6px; border-radius: 4px; font-size: 12px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;";
                ligne.innerHTML = `
                    <div>📍 Site: <b>${ex.site}</b> | Bât: <b>${ex.batiment}</b> | Rang: <b>${ex.rang}</b></div>
                    <div style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Qte: ${ex.quantite}</div>
                `;
                ligne.addEventListener('click', () => ouvrirModalStockSymboleJson(ex));
                wrapper.appendChild(ligne);
            });
        } else {
            let vide = document.createElement('div');
            vide.style.cssText = "font-size: 12px; color: #856404; font-style: italic;";
            vide.textContent = 'Aucun stock enregistré pour ce symbole. Cliquez sur "Ajouter Stock".';
            wrapper.appendChild(vide);
        }

        divStock.appendChild(wrapper);
    }

    document.getElementById('resultatJson').style.display = 'block';
}

function ouvrirModalStockSymboleJson(existant) {
    contexteMouvementJson = { donnees: existant };
    document.getElementById('modalTitreJson').textContent    = existant ? "Modifier stock Symbole" : "Ajouter stock Symbole";
    document.getElementById('modalSousTitreJson').textContent = `Symbole : ${articleCourantJson.symbole}`;

    document.getElementById('mouvementTypeJson').value   = 'ENTREE';
    document.getElementById('stockSiteJson').value       = existant ? existant.site     : (dernierSiteSaisiJson     || '');
    document.getElementById('stockBatimentJson').value   = existant ? existant.batiment : (dernierBatimentSaisiJson || '');
    document.getElementById('stockRangJson').value       = existant ? existant.rang     : '';
    document.getElementById('stockQuantiteJson').value   = '1';

    document.getElementById('modalOverlayJson').style.display = 'flex';
}

function fermerModalJson() {
    document.getElementById('modalOverlayJson').style.display = 'none';
    contexteMouvementJson = null;
}

function validerMouvementStockJson() {
    if (!articleCourantJson) return;

    let qte      = parseInt(document.getElementById('stockQuantiteJson').value) || 0;
    let site     = document.getElementById('stockSiteJson').value.trim();
    let batiment = document.getElementById('stockBatimentJson').value.trim();
    let rang     = document.getElementById('stockRangJson').value.trim();
    let typeMvt  = document.getElementById('mouvementTypeJson').value;

    if (qte <= 0)                      { alert("Quantité invalide");                            return; }
    if (!site || !batiment || !rang)   { alert("Remplissez tous les champs d'emplacement.");   return; }

    dernierSiteSaisiJson     = site;
    dernierBatimentSaisiJson = batiment;

    let index = stockGlobalJson.findIndex(item =>
        String(item.symbole  || "").trim().toLowerCase() === String(articleCourantJson.symbole || "").trim().toLowerCase() &&
        (!item.plan || item.plan === "SYMB" || item.plan === articleCourantJson.plan) &&
        String(item.site     || "").toLowerCase() === site.toLowerCase()     &&
        String(item.batiment || "").toLowerCase() === batiment.toLowerCase() &&
        String(item.rang     || "").toLowerCase() === rang.toLowerCase()
    );

    if (typeMvt === 'ENTREE') {
        if (index !== -1) {
            stockGlobalJson[index].quantite = (parseInt(stockGlobalJson[index].quantite) || 0) + qte;
        } else {
            stockGlobalJson.push({
                plan:      articleCourantJson.plan        || "SYMB",
                rep:       "",
                symbole:   articleCourantJson.symbole,
                intitule: articleCourantJson.intitule || "",
                site, batiment, rang,
                quantite: qte
            });
        }
    } else {
        if (index === -1 || (parseInt(stockGlobalJson[index].quantite) || 0) < qte) {
            alert("Stock insuffisant ou emplacement introuvable.");
            return;
        }
        stockGlobalJson[index].quantite -= qte;
    }

    localStorage.setItem('stock_local_sauvegarde', JSON.stringify(stockGlobalJson));
    fermerModalJson();
    document.getElementById('inputSymboleJson').value = '';
    reinitialiserFicheJson();
    alert("✅ Mouvement JSON enregistré avec succès !");
}

function masquerLoaderGlobal() {
    setTimeout(() => {
        let loader = document.getElementById('loaderGlobal');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 400);
        }
    }, 200);
}
