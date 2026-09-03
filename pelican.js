/**
 * ==============================================================================
 * 1. CONFIGURATION & INITIALISATION GLOBALE
 * ==============================================================================
 */
const PELICAN_VERSION_APP = "PELICAN-UNIFIED-V1";
const GITHUB_BASE_URL = "https://raw.githubusercontent.com/lebob18-ux/MIGNATURE_K1/main/";
const SUPABASE_URL = "https://thbqkeugjvsxbryfnzuo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2-Ij-nrTPeK6rB-kSD-QTg_b42zNakq";

// Initialisation propre de Supabase directement dans le fichier
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabaseClientAuth || null;
    
    if (!window.supabaseClient && typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
        window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    
    if (!window.supabaseClient) {
        console.warn("⚠️ Le client Supabase n'est pas encore disponible.");
    }
}

let cataloguePlanGlobal = [];
let stockGlobal = [];
let articleCourant = null;
let contexteMouvement = null;
let dernierSiteSaisi = '';
let dernierBatimentSaisi = '';


/**
 * ==============================================================================
 * 2. FONCTIONS UTILITAIRES & INTERFACE (Loader / Reset)
 * ==============================================================================
 */
function masquerLoader() {
    let loader = document.getElementById('loaderGlobal');
    if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.3s ease';
        setTimeout(() => loader.remove(), 300);
    }
}

function mettreAJourProgression(pourcentage) {
    let barre = document.getElementById('barreProgression');
    if (barre) {
        barre.style.width = pourcentage + '%';
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


/**
 * ==============================================================================
 * 3. CHARGEMENT DES DONNÉES (Excel PELICAN1.xlsx & Stock Local)
 * ==============================================================================
 */
window.addEventListener('DOMContentLoaded', () => {
    const fallbackLoader = setTimeout(masquerLoader, 3000);

    console.log(`%c[PELICAN MODE] : ${PELICAN_VERSION_APP}`, "background: #0056b3; color: white; padding: 4px; font-size: 14px; font-weight: bold;");

    ['inputPlan', 'stockSite', 'stockBatiment', 'stockRang', 'stockQuantite'].forEach(id => {
        let el = document.getElementById(id);
        if (el) {
            el.addEventListener('focus', function() { this.select(); });
        }
    });

    mettreAJourProgression(40);

    Promise.all([
        fetch(GITHUB_BASE_URL + 'PELICAN1.xlsx')
            .then(res => {
                if (!res.ok) throw new Error("Erreur réseau PELICAN1.xlsx");
                return res.arrayBuffer();
            })
            .then(buffer => {
                mettreAJourProgression(80);
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
            })
            .catch(err => {
                console.warn("⚠️ Impossible de charger PELICAN1.xlsx :", err);
                return [];
            }),
        Promise.resolve(localStorage.getItem('stock_local_sauvegarde'))
    ]).then(([planData, stockSauvegarde]) => {
        cataloguePlanGlobal = planData || [];
        if (stockSauvegarde) {
            try { stockGlobal = JSON.parse(stockSauvegarde); } catch(e) { stockGlobal = []; }
        }
        mettreAJourProgression(100);
    }).finally(() => {
        clearTimeout(fallbackLoader);
        setTimeout(masquerLoader, 200);
    });

    document.getElementById('inputPlan')?.addEventListener('input', () => { 
        reinitialiserFicheEtSaisies();
        afficherSuggestionsPelican(); 
    });
});


/**
 * ==============================================================================
 * 4. MOTEUR DE RECHERCHE & AFFICHAGE DE LA FICHE ARTICLE
 * ==============================================================================
 */
function afficherSuggestionsPelican() {
    let container = document.getElementById('listePlanResultats');
    if (!container) return;
    container.innerHTML = '';
    let recherchePlan = document.getElementById('inputPlan').value.toLowerCase().trim();
    if (!recherchePlan) return;

    let matches = cataloguePlanGlobal.filter(item => {
        let p = String(item.plan || "").toLowerCase().trim().replace(/^0+/, '');
        let r = String(item.rep || "").toLowerCase().trim();
        let i = String(item.intitule || "").toLowerCase().trim();
        let query = recherchePlan.replace(/^0+/, '');
        return p.includes(query) || r.includes(query) || i.includes(query);
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
            container.innerHTML = '';
            afficherFichePelican(article);
        });
        wrapper.appendChild(div);
    });
    container.appendChild(wrapper);
}

function afficherFichePelican(article) {
    articleCourant = article;
    document.getElementById('resPlan').textContent = article.plan || '-';
    document.getElementById('resRep').textContent = article.rep === "000000" ? "Sans repère" : (article.rep || '-');
    document.getElementById('resIntitule').textContent = article.intitule || '-';

    let plan6 = String(article.plan).trim().padStart(6, '0');
    let cheminImage = `${plan6}.jpg`;
    
    let img = document.getElementById('imgPiece');
    let imageParDefaut = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22200%22%3E%3Crect width=%22320%22 height=%22200%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22%23aaa%22%3EImage introuvable%3C/text%3E%3C/svg%3E';
    
    if (img) {
        img.src = imageParDefaut;
        img.onerror = () => { img.src = imageParDefaut; };
    }

    if (window.supabaseClient) {
        window.supabaseClient.storage.from('MIGNATURE_K1').createSignedUrl(cheminImage, 60)
            .then(({ data, error }) => {
                let elImg = document.getElementById('imgPiece');
                if (elImg && data && !error) {
                    elImg.src = data.signedUrl;
                }
            })
            .catch(() => {});
    }

    let existantsPlanRep = stockGlobal.filter(item => 
        String(item.plan || "").trim() === String(article.plan || "").trim() &&
        String(item.rep || "").trim() === String(article.rep || "").trim() &&
        (!item.symbole || item.symbole === "" || item.symbole === "0")
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
            let exStr = JSON.stringify(ex).replace(/"/g, '&quot;');
            htmlStock += `<div onclick="ouvrirModalPlanRep(${exStr})" style="cursor: pointer; background: #d4edda; border: 1px solid #c3e6cb; padding: 6px; border-radius: 4px; font-size: 12px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
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
            
            let intituleSy = c.designation || "Sans intitulé";
            let cStr = JSON.stringify(c).replace(/"/g, '&quot;');
            let imgId = `img_sy_${c.symbole}_${Math.random().toString(36).substr(2, 5)}`;

            let htmlSy = `<div style="display: flex; gap: 8px; align-items: center;">
                <img id="${imgId}" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2245%22%3E%3Crect width=%2260%22 height=%2245%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%229%22 fill=%22%23999%22%3ELoading...%3C/text%3E%3C/svg%3E" style="width: 80px; height: 60px; object-fit: contain; border: 1px solid #ccc; background: #fff;">
                <div style="flex-grow: 1; font-size: 12px;">
                    <strong style="color: #0056b3;">N° SY : ${c.symbole}</strong> | Plan : <b>${c.plan}</b> | Requis : <b>${c.quantite}</b><br>
                    <span style="color: #222; font-weight: 600;">Intitulé : ${intituleSy}</span>
                </div>
            </div>`;

            if (stockSy.length > 0) {
                htmlSy += `<div style="margin-top: 6px; border-top: 1px solid #eee; padding-top: 4px;">`;
                stockSy.forEach(st => {
                    let stStr = JSON.stringify(st).replace(/"/g, '&quot;');
                    htmlSy += `<div onclick="ouvrirModalSortieSy(${cStr}, ${stStr})" style="cursor: pointer; background: #d4edda; border: 1px solid #c3e6cb; padding: 5px; border-radius: 4px; font-size: 11px; margin-top: 3px; display: flex; justify-content: space-between; align-items: center;">
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

            if (window.supabaseClient) {
                window.supabaseClient.storage.from('MIGNATURE_K1').createSignedUrl(`${c.symbole}.jpg`, 60)
                    .then(({ data }) => {
                        let elImg = document.getElementById(imgId);
                        if (elImg && data) elImg.src = data.signedUrl;
                    });
            }
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


/**
 * ==============================================================================
 * 5. GESTION DES MODALES DE MOUVEMENT DE STOCK
 * ==============================================================================
 */
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
            (!item.symbole || item.symbole === "" || item.symbole === "0") &&
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
    
    let inputPlan = document.getElementById('inputPlan');
    if (inputPlan) inputPlan.value = '';
    reinitialiserFicheEtSaisies();
    
    alert("✅ Mouvement Pelican enregistré avec succès !");
}


/**
 * ==============================================================================
 * 6. ACTIONS DIVERSES (Impression, etc.)
 * ==============================================================================
 */
function imprimerFichePelican() {
    window.print();
}
