const GITHUB_BASE_URL = "https://raw.githubusercontent.com/lebob18-ux/MIGNATURE_K1/main/";
const GITHUB_IMG_URL = GITHUB_BASE_URL + "IMG_JPG/";

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    let btn = document.getElementById('btnInstaller');
    if (btn) btn.style.display = 'block';
});

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    let btn = document.getElementById('btnInstaller');
    if (btn) btn.style.display = 'none';
});

function installerApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((result) => {
        if (result.outcome === 'accepted') {
            let btn = document.getElementById('btnInstaller');
            if (btn) btn.style.display = 'none';
        }
        deferredPrompt = null;
    });
}

let cataloguePlanGlobal = [];
let catalogueSymboleGlobal = [];
let stockGlobal = [];
let articleCourant = null;

window.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("Service Worker non enregistré"));
    }

    Promise.all([
        fetch(GITHUB_BASE_URL + 'PELICAN1.xlsx')
            .then(res => {
                if (!res.ok) throw new Error("Fichier PELICAN1.xlsx introuvable sur GitHub");
                return res.arrayBuffer();
            })
            .then(buffer => {
                let workbook = XLSX.read(buffer, { type: 'array' });
                let premiereFeuille = workbook.SheetNames[0];
                let donneesBrutes = XLSX.utils.sheet_to_json(workbook.Sheets[premiereFeuille]);

                let donneesValides = donneesBrutes.filter(row => row && row.PLAN !== undefined && String(row.PLAN).trim() !== "");

                return donneesValides.map(row => {
                    let rawRep = String(row.REP || "").trim();
                    let cleanRep = (rawRep === "" || rawRep === "******") ? "000000" : rawRep;
                    return {
                        pelican:     String(row.PELICAN          || "").trim(),
                        plan:        String(row.PLAN             || "").trim(),
                        rep:         cleanRep,
                        intitule:    String(row.INT_PLAN         || "").trim(),
                        symbole:     String(row.SYMBOLE_ECLATE   || "").trim(),
                        quantite:    parseInt(row.QUANTITE)      || 1,
                        designation: String(row.DESIGNATION      || "").trim()
                    };
                });
            })
            .catch(err => {
                console.error("Erreur de chargement de PELICAN1.xlsx :", err);
                return [];
            }),

        fetch(GITHUB_BASE_URL + 'mapping.json')
            .then(res => res.json())
            .catch(err => {
                console.error("Erreur de chargement de mapping.json :", err);
                return [];
            }),

        Promise.resolve(localStorage.getItem('stock_local_sauvegarde'))
    ])
    .then(([planData, symboleData, stockSauvegarde]) => {
        cataloguePlanGlobal    = planData;
        catalogueSymboleGlobal = symboleData;
        console.log("PELICAN1.xlsx chargé :", cataloguePlanGlobal.length, "lignes.");
        console.log("mapping.json chargé :", catalogueSymboleGlobal.length, "lignes.");

        if (stockSauvegarde) {
            stockGlobal = JSON.parse(stockSauvegarde);
            console.log("Stock récupéré :", stockGlobal.length, "entrées.");
        }
    })
    .catch(err => console.error("Erreur critique au démarrage :", err));

    // --- ÉCOUTEURS DE SAISIE ---
    const inputPlan = document.getElementById('inputPlan');
    if (inputPlan) {
        inputPlan.addEventListener('input', () => {
            let saisieSym = document.getElementById('inputSymbole');
            if (saisieSym) saisieSym.value = '';
            let sug = document.getElementById('suggestions');
            if (sug) sug.innerHTML = '';
            let res = document.getElementById('resultat');
            if (res) res.style.display = 'none';
            afficherSuggestionsPlan();
        });
    }

    const inputRep = document.getElementById('inputRep');
    if (inputRep) {
        inputRep.addEventListener('input', () => {
            let res = document.getElementById('resultat');
            if (res) res.style.display = 'none';
            afficherSuggestionsPlan();
        });
    }

    const inputSymbole = document.getElementById('inputSymbole');
    if (inputSymbole) {
        inputSymbole.addEventListener('input', (e) => {
            let valeur = e.target.value.trim();
            if (valeur.length > 0) {
                if (inputPlan) inputPlan.value = '';
                if (inputRep)  inputRep.value  = '';
                let listeRes = document.getElementById('listePlanResultats');
                if (listeRes) listeRes.innerHTML = '';
                let res = document.getElementById('resultat');
                if (res) res.style.display = 'none';
            }
            if (valeur.length >= 3) {
                afficherSuggestionsSymbole(valeur);
            } else {
                let sug = document.getElementById('suggestions');
                if (sug) sug.innerHTML = '';
            }
        });
    }

    const stockQuantite = document.getElementById('stockQuantite');
    if (stockQuantite) {
        stockQuantite.addEventListener('focus', function () { this.select(); });
    }
});

// --- RECHERCHE PLAN & REPÈRE ---
function afficherSuggestionsPlan() {
    let container = document.getElementById('listePlanResultats');
    if (!container) return;
    container.innerHTML = '';

    let recherchePlan = (document.getElementById('inputPlan') || {value: ''}).value.toLowerCase().trim();
    let rechercheRep  = (document.getElementById('inputRep')  || {value: ''}).value.toLowerCase().trim();

    if (!recherchePlan && !rechercheRep) return;

    let matches = cataloguePlanGlobal.filter(item => {
        let p            = String(item.plan || "").toLowerCase().trim().replace(/^0+/, '');
        let r            = String(item.rep  || "").toLowerCase().trim().replace(/^0+/, '');
        let cleanRechPlan = recherchePlan.replace(/^0+/, '');
        let cleanRechRep  = rechercheRep.replace(/^0+/, '');

        let matchPlan = recherchePlan === "" || p.includes(cleanRechPlan) || String(item.plan || "").toLowerCase().includes(recherchePlan);
        let matchRep  = rechercheRep  === "" || r.includes(cleanRechRep)  || String(item.rep  || "").toLowerCase().includes(rechercheRep);

        return matchPlan && matchRep;
    });

    let resultatsUniques = [...new Map(matches.map(item => [item.plan + "_" + item.rep, item])).values()]
        .slice(0, 10);

    if (resultatsUniques.length === 0) {
        container.innerHTML = '<div style="padding: 8px; color: #777; font-size: 13px; background: white; border: 1px solid #ddd;">Aucun résultat trouvé</div>';
        return;
    }

    // Conteneur flottant
    let wrapper = document.createElement('div');
    wrapper.style.cssText = "background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 250px; overflow-y: auto; margin-top: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); position: absolute; z-index: 1000; width: 92%;";

    // FIX : on utilise addEventListener au lieu de onclick="..." dans le HTML
    // pour éviter le bug avec les apostrophes dans les intitulés (ex: "RAPPEL D'ECART")
    resultatsUniques.forEach(article => {
        let displayRep = (article.rep === "000000") ? "Sans repère" : article.rep;
        let div = document.createElement('div');
        div.style.cssText = "padding: 10px 12px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 14px; background: white;";
        div.innerHTML = `<strong>Plan : ${article.plan}</strong> | <strong>Rep : ${displayRep}</strong><br>` +
                        `<small style="color: #555;">${article.intitule || ''}</small>`;
        div.addEventListener('mouseover', () => div.style.background = '#f1f8ff');
        div.addEventListener('mouseout',  () => div.style.background = 'white');
        div.addEventListener('click',     () => selectionnerPlanDansListe(article));
        wrapper.appendChild(div);
    });

    container.appendChild(wrapper);
}

function selectionnerPlanDansListe(article) {
    let inputPlan = document.getElementById('inputPlan');
    let inputRep  = document.getElementById('inputRep');
    if (inputPlan) inputPlan.value = article.plan;
    if (inputRep)  inputRep.value  = (article.rep === "000000") ? "" : article.rep;
    let listeRes = document.getElementById('listePlanResultats');
    if (listeRes) listeRes.innerHTML = '';
    afficherFiche(article);
}

// --- RECHERCHE PAR SYMBOLE ---
function afficherSuggestionsSymbole(prefixe) {
    let container = document.getElementById('suggestions');
    if (!container) return;
    container.innerHTML = '';

    let matches = catalogueSymboleGlobal.filter(item => String(item.symbole || "").startsWith(prefixe));

    if (matches.length === 0) {
        container.innerHTML = '<div style="padding: 10px; color: #777; font-size: 14px;">Aucune correspondance</div>';
        return;
    }

    matches.forEach(article => {
        let div = document.createElement('div');
        div.className = 'suggestion-item';
        let imgUrl = article.symbole ? `${GITHUB_IMG_URL}${article.symbole}.jpg` : '';

        div.innerHTML = `
            <img src="${imgUrl}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;"
                 onerror="this.src='https://via.placeholder.com/60x45?text=No'">
            <div style="font-size: 14px; margin-left: 10px;">
                <strong style="color: #0056b3;">Symb: ${article.symbole}</strong> (Plan: ${article.plan})<br>
                <small style="color: #555; display: inline-block; margin-top: 3px;">${article.intitule}</small>
            </div>
        `;

        // FIX : addEventListener à la place de onclick inline (même protection apostrophe)
        div.addEventListener('click', () => {
            let inputSymbole = document.getElementById('inputSymbole');
            let inputPlan    = document.getElementById('inputPlan');
            let inputRep     = document.getElementById('inputRep');
            if (inputSymbole) inputSymbole.value = article.symbole;
            if (inputPlan)    inputPlan.value    = article.plan;
            if (inputRep)     inputRep.value     = (article.rep === "000000") ? "" : (article.rep || '');
            let sug = document.getElementById('suggestions');
            if (sug) sug.innerHTML = '';
            afficherFiche(article);
        });

        container.appendChild(div);
    });
}

// --- AFFICHAGE DE LA FICHE ---
function afficherFiche(article) {
    articleCourant = article;

    let resPlan    = document.getElementById('resPlan');
    let resRep     = document.getElementById('resRep');
    let resIntitule = document.getElementById('resIntitule');
    if (resPlan)     resPlan.textContent     = article.plan || '-';
    if (resRep)      resRep.textContent      = (article.rep === "000000") ? "Sans repère" : (article.rep || '-');
    if (resIntitule) resIntitule.textContent = article.intitule || '-';

    // Composants du plan/repère
    let composantsPlan = cataloguePlanGlobal.filter(item => {
        let matchPlan = String(item.plan || "").trim() === String(article.plan || "").trim();
        let matchRep  = article.rep ? (String(item.rep || "").trim() === String(article.rep || "").trim()) : true;
        return matchPlan && matchRep;
    });

    if (composantsPlan.length === 0) {
        composantsPlan = cataloguePlanGlobal.filter(item =>
            String(item.plan || "").trim() === String(article.plan || "").trim()
        );
    }

    let conteneurComposants = document.getElementById('resSymbole');
    if (conteneurComposants) {
        let wrapper = document.createElement('div');
        wrapper.style.cssText = "display: flex; flex-direction: column; gap: 8px; margin-top: 6px;";

        composantsPlan.forEach(c => {
            let imgSymbUrl = c.symbole ? `${GITHUB_IMG_URL}${c.symbole}.jpg` : '';
            let row = document.createElement('div');
            row.style.cssText = "display: flex; align-items: center; background: #f8f9fa; border: 1px solid #e9ecef; padding: 6px; border-radius: 4px;";
            row.innerHTML = `
                <img src="${imgSymbUrl}" style="width: 50px; height: 38px; object-fit: contain; border-radius: 3px; border: 1px solid #ccc; background: #fff; margin-right: 10px;"
                     onerror="this.src='https://via.placeholder.com/50x38?text=No'">
                <div style="font-size: 13px;">
                    <strong>Symbole : ${c.symbole || '-'}</strong> | Qte : <b>${c.quantite || 1}</b><br>
                    <small style="color: #666;">${c.designation || c.intitule || ''}</small>
                </div>
            `;
            wrapper.appendChild(row);
        });

        conteneurComposants.innerHTML = '';
        conteneurComposants.appendChild(wrapper);
    }

    // Image principale
    let img = document.getElementById('imgPiece');
    let nomImage = "";
    let saisieSymboleActif = (document.getElementById('inputSymbole') || {value: ''}).value.trim();

    if (saisieSymboleActif) {
        nomImage = saisieSymboleActif;
    } else if (article.plan) {
        let plan6    = String(article.plan).trim().padStart(6, '0');
        let repClean = (article.rep && article.rep !== "000000") ? article.rep : "000000";
        let rep6     = String(repClean).trim().padStart(6, '0');
        nomImage = `${plan6}-${rep6}`;
    }

    if (img) {
        img.src = nomImage ? `${GITHUB_IMG_URL}${nomImage}.jpg` : '';
        img.onerror = () => img.src = 'https://via.placeholder.com/320x240?text=Image+Introuvable';
    }

    // Stock existant
    let existants = stockGlobal.filter(item => {
        let matchPlan = String(item.plan || "").trim() === String(article.plan || "").trim();
        let matchRep  = article.rep ? (String(item.rep || "").trim() === String(article.rep || "").trim()) : true;
        return matchPlan && matchRep;
    });

    let divStock = document.getElementById('infoStockActuel');
    if (divStock) {
        if (existants.length > 0) {
            divStock.style.display         = 'block';
            divStock.style.backgroundColor = '#d4edda';
            divStock.style.border          = '1px solid #c3e6cb';
            divStock.style.color           = '#155724';

            // FIX : construction DOM au lieu de innerHTML avec JSON inline
            // pour éviter le bug apostrophe dans site/batiment/rang
            let header = document.createElement('div');
            header.innerHTML = `<strong>📦 EMPLACEMENTS EN STOCK (${existants.length}) :</strong><br>` +
                               `<p style="font-size: 12px; margin: 4px 0 8px 0;">Cliquez pour sélectionner :</p>`;

            let liste = document.createElement('div');
            liste.style.cssText = "display: flex; flex-direction: column; gap: 6px;";

            existants.forEach(ex => {
                let item = document.createElement('div');
                item.style.cssText = "cursor: pointer; background: white; border: 1px solid #28a745; padding: 6px 10px; border-radius: 4px; font-size: 13px; display: flex; justify-content: space-between; align-items: center;";
                item.innerHTML = `
                    <div>📍 Site: <b>${ex.site || ''}</b> | Bât: <b>${ex.batiment || ''}</b> | Rang: <b>${ex.rang || ''}</b></div>
                    <div style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Qte: ${ex.quantite || 0}</div>
                `;
                item.addEventListener('click', () => selectionnerEmplacementExistant(ex));
                liste.appendChild(item);
            });

            divStock.innerHTML = '';
            divStock.appendChild(header);
            divStock.appendChild(liste);
        } else {
            divStock.style.display         = 'block';
            divStock.style.backgroundColor = '#fff3cd';
            divStock.style.border          = '1px solid #ffeeba';
            divStock.style.color           = '#856404';
            divStock.innerHTML = `<strong>⚠️ AUCUN STOCK :</strong> Saisissez l'emplacement pour créer le stock.`;
        }
    }

    let elSite    = document.getElementById('stockSite');
    let elBat     = document.getElementById('stockBatiment');
    let elRang    = document.getElementById('stockRang');
    let elQte     = document.getElementById('stockQuantite');
    let elMvt     = document.getElementById('mouvementType');
    if (elSite) elSite.value = "";
    if (elBat)  elBat.value  = "";
    if (elRang) elRang.value = "";
    if (elQte)  elQte.value  = "1";
    if (elMvt)  elMvt.value  = "ENTREE";

    let resDiv = document.getElementById('resultat');
    if (resDiv) resDiv.style.display = 'block';
}

function selectionnerEmplacementExistant(existant) {
    let elSite = document.getElementById('stockSite');
    let elBat  = document.getElementById('stockBatiment');
    let elRang = document.getElementById('stockRang');
    if (elSite) elSite.value = existant.site    || "";
    if (elBat)  elBat.value  = existant.batiment || "";
    if (elRang) elRang.value = existant.rang     || "";
    let qteInput = document.getElementById('stockQuantite');
    if (qteInput) qteInput.focus();
}

// --- MOUVEMENT DE STOCK ---
function validerMouvementStock() {
    if (!articleCourant) return;

    let typeMvt     = (document.getElementById('mouvementType')  || {value: 'ENTREE'}).value;
    let site        = (document.getElementById('stockSite')       || {value: ''}).value.trim();
    let batiment    = (document.getElementById('stockBatiment')   || {value: ''}).value.trim();
    let rang        = (document.getElementById('stockRang')        || {value: ''}).value.trim();
    let qteDemandee = parseInt((document.getElementById('stockQuantite') || {value: '1'}).value) || 0;

    if (qteDemandee <= 0) {
        alert("⚠️ Quantité invalide. Veuillez saisir un nombre supérieur à 0.");
        return;
    }

    if (typeMvt === 'SORTIE' && confirm("Confirmez-vous la sortie globale de TOUTES les pièces composant ce plan ?")) {
        let piecesMontage = cataloguePlanGlobal.filter(item =>
            String(item.plan || "").trim() === String(articleCourant.plan || "").trim()
        );

        if (piecesMontage.length === 0) {
            alert("❌ Erreur : aucun composant trouvé pour ce plan dans PELICAN1.");
            return;
        }

        for (let piece of piecesMontage) {
            let indexStock = stockGlobal.findIndex(s =>
                String(s.plan    || "").trim() === String(piece.plan    || "").trim() &&
                String(s.symbole || "").trim() === String(piece.symbole || "").trim()
            );
            if (indexStock !== -1) {
                stockGlobal[indexStock].quantite = Math.max(0, (parseInt(stockGlobal[indexStock].quantite) || 0) - qteDemandee);
            }
        }

        localStorage.setItem('stock_local_sauvegarde', JSON.stringify(stockGlobal));
        _resetRecherche();
        alert("✅ Sortie globale du montage effectuée avec succès !");
        return;
    }

    if (!site || !batiment || !rang) {
        alert("⚠️ Veuillez remplir tous les champs d'emplacement (Site, Bâtiment, Rang).");
        return;
    }

    let index = stockGlobal.findIndex(item =>
        String(item.plan     || "").trim()        === String(articleCourant.plan || "").trim() &&
        String(item.rep      || "").trim()        === String(articleCourant.rep  || "").trim() &&
        String(item.site     || "").toLowerCase() === site.toLowerCase()     &&
        String(item.batiment || "").toLowerCase() === batiment.toLowerCase() &&
        String(item.rang     || "").toLowerCase() === rang.toLowerCase()
    );

    if (typeMvt === 'ENTREE') {
        if (index !== -1) {
            stockGlobal[index].quantite = (parseInt(stockGlobal[index].quantite) || 0) + qteDemandee;
        } else {
            stockGlobal.push({
                plan:     articleCourant.plan,
                rep:      articleCourant.rep     || "",
                symbole:  articleCourant.symbole || "",
                intitule: articleCourant.intitule || "",
                site:     site,
                batiment: batiment,
                rang:     rang,
                quantite: qteDemandee
            });
        }
    } else {
        if (index === -1) {
            alert("❌ Erreur : cet emplacement n'existe pas en stock.");
            return;
        }
        let currentQte = parseInt(stockGlobal[index].quantite) || 0;
        if (qteDemandee > currentQte) {
            alert(`❌ Stock insuffisant !\nQuantité actuelle disponible : ${currentQte}`);
            return;
        }
        stockGlobal[index].quantite = currentQte - qteDemandee;
    }

    localStorage.setItem('stock_local_sauvegarde', JSON.stringify(stockGlobal));
    _resetRecherche();
    alert(typeMvt === 'ENTREE' ? "✅ Entrée de stock validée !" : "✅ Sortie de stock validée !");
}

// --- UTILITAIRE RESET ---
function _resetRecherche() {
    let resDiv   = document.getElementById('resultat');
    let inputPlan = document.getElementById('inputPlan');
    let inputRep  = document.getElementById('inputRep');
    let listeRes  = document.getElementById('listePlanResultats');
    if (resDiv)    resDiv.style.display = 'none';
    if (inputPlan) inputPlan.value = "";
    if (inputRep)  inputRep.value  = "";
    if (listeRes)  listeRes.innerHTML = "";
    articleCourant = null;
}

// --- EXPORT DU STOCK ---
function exporterStockCSV() {
    if (stockGlobal.length === 0) {
        alert("⚠️ Aucun stock à exporter.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Plan;Rep;Symbole;Intitule;Site;Batiment;Rang;Quantite\n";

    stockGlobal.forEach(item => {
        let ligne = [
            item.plan || "",
            item.rep === "000000" ? "" : (item.rep || ""),
            item.symbole || "",
            `"${(item.intitule || "").replace(/"/g, '""')}"`,
            item.site     || "",
            item.batiment || "",
            item.rang     || "",
            item.quantite || 0
        ].join(";");
        csvContent += ligne + "\n";
    });

    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "stock_terrain_" + new Date().toISOString().slice(0, 10) + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
