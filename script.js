const VERSION_APP = "v2.7-FIX-PLAN-SY"; // ⚠️ Numéro de version mis à jour pour test
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
    // 🚀 ALERTE VISUELLE DE VERSION (À supprimer à la fin des essais)
    console.log(`%c[VERSION ACTIVE] : ${VERSION_APP}`, "background: #222; color: #bada55; padding: 4px; font-size: 14px; font-weight: bold;");
    
    let bannerVersion = document.createElement('div');
    bannerVersion.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; background: #28a745; color: white; text-align: center; padding: 6px; font-size: 12px; font-weight: bold; z-index: 99999; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
    bannerVersion.innerHTML = `TEST ACTIF : ${VERSION_APP} <span style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px; margin-left: 10px; cursor: pointer;" onclick="this.parentElement.remove()">Fermer [X]</span>`;
    document.body.prepend(bannerVersion);

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
                        plan:        String(row.PLAN              || "").trim(),
                        rep:         cleanRep,
                        intitule:    String(row.INT_PLAN          || "").trim(),
                        symbole:     String(row.SYMBOLE_ECLATE    || "").trim(),
                        quantite:    parseInt(row.QUANTITE)       || 1,
                        designation: String(row.DESIGNATION       || "").trim()
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
        let p             = String(item.plan || "").toLowerCase().trim().replace(/^0+/, '');
        let r             = String(item.rep  || "").toLowerCase().trim().replace(/^0+/, '');
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

    let wrapper = document.createElement('div');
    wrapper.style.cssText = "background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 250px; overflow-y: auto; margin-top: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); position: absolute; z-index: 1000; width: 92%;";

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
                 onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2245%22%3E%3Crect width=%2260%22 height=%2245%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%229%22 fill=%22%23999%22%3ENo img%3C/text%3E%3C/svg%3E'">
            <div style="font-size: 14px; margin-left: 10px;">
                <strong style="color: #0056b3;">Symb: ${article.symbole}</strong> (Plan: ${article.plan})<br>
                <small style="color: #555; display: inline-block; margin-top: 3px;">${article.intitule}</small>
            </div>
        `;

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

// --- AFFICHAGE DE LA FICHE (PLAN-REP TRAITÉ COMME UN SY DANS LE STOCK) ---
function afficherFiche(article) {
    articleCourant = article;

    // --- BLOC 1 : INFOS DU PLAN & MINIATURE EN HAUT ---
    let resPlan     = document.getElementById('resPlan');
    let resRep      = document.getElementById('resRep');
    let resIntitule = document.getElementById('resIntitule');
    if (resPlan)     resPlan.textContent     = article.plan || '-';
    if (resRep)      resRep.textContent      = (article.rep === "000000") ? "Sans repère" : (article.rep || '-');
    if (resIntitule) resIntitule.textContent = article.intitule || '-';

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
        img.onerror = () => { img.onerror = null; img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%22200%22%3E%3Crect width=%22320%22 height=%22200%22 fill=%22%23f0f0f0%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2216%22 fill=%22%23aaa%22%3EImage introuvable%3C/text%3E%3C/svg%3E'; };
    }

    // Stock du Plan-Repère global (traité individuellement comme un SY)
    let existantsPlanRep = stockGlobal.filter(item => {
        let matchPlan = String(item.plan || "").trim() === String(article.plan || "").trim();
        let matchRep  = String(item.rep || "").trim() === String(article.rep || "").trim();
        let matchSymb = !item.symbole || item.symbole === ""; // Uniquement les entrées directes du plan-rep
        return matchPlan && matchRep && matchSymb;
    });

    let divStock = document.getElementById('infoStockActuel');
    if (divStock) {
        if (existantsPlanRep.length > 0) {
            divStock.style.display         = 'block';
            divStock.style.backgroundColor = '#d4edda';
            divStock.style.border          = '1px solid #c3e6cb';
            divStock.style.color           = '#155724';
            divStock.style.padding         = '8px';
            divStock.style.borderRadius    = '4px';

            let header = document.createElement('div');
            header.innerHTML = `<strong>📦 STOCK DU PLAN-REPÈRE (${existantsPlanRep.length}) :</strong><br>` +
                               `<p style="font-size: 12px; margin: 4px 0 6px 0;">Cliquez pour sélectionner l'emplacement :</p>`;

            let liste = document.createElement('div');
            liste.style.cssText = "display: flex; flex-direction: column; gap: 4px;";

            existantsPlanRep.forEach(ex => {
                let item = document.createElement('div');
                item.style.cssText = "cursor: pointer; background: white; border: 1px solid #28a745; padding: 5px 8px; border-radius: 4px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;";
                item.innerHTML = `
                    <div>📍 Site: <b>${ex.site || ''}</b> | Bât: <b>${ex.batiment || ''}</b> | Rang: <b>${ex.rang || ''}</b></div>
                    <div style="background: #28a745; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;">Qte: ${ex.quantite || 0}</div>
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
            divStock.style.padding         = '8px';
            divStock.style.borderRadius    = '4px';
            divStock.innerHTML = `<strong>⚠️ AUCUN STOCK POUR CE PLAN-REPÈRE :</strong> Saisissez l'emplacement ci-dessous.`;
        }
    }

    // --- BLOC 2 : LISTE DES SYMBOLES (EXCLUANT LES ENSEMBLES COMPLETS) AVEC STOCK SY INDIVIDUEL ---
    let composantsPlan = cataloguePlanGlobal.filter(item => {
        let matchPlan = String(item.plan || "").trim() === String(article.plan || "").trim();
        let matchRep  = article.rep ? (String(item.rep || "").trim() === String(article.rep || "").trim()) : true;
        // Exclusion si l'élément correspond à l'ensemble lui-même ou n'a pas de symbole éclaté valide
        let estEnsembleComplet = String(item.symbole || "").trim() === "" || String(item.symbole || "").trim() === "0";
        return matchPlan && matchRep && !estEnsembleComplet;
    });

    let conteneurComposants = document.getElementById('resSymbole');
    if (conteneurComposants) {
        conteneurComposants.innerHTML = '';

        let titreSection = document.createElement('div');
        titreSection.style.cssText = "font-size: 14px; font-weight: bold; color: #0056b3; margin: 15px 0 8px 0; border-bottom: 2px solid #0056b3; padding-bottom: 4px;";
        titreSection.textContent = `Composition Éclatée & Stock des Symboles (SY) :`;
        conteneurComposants.appendChild(titreSection);

        if (composantsPlan.length === 0) {
            let aucunMsg = document.createElement('div');
            aucunMsg.style.cssText = "font-size: 13px; color: #666; font-style: italic; padding: 6px;";
            aucunMsg.textContent = "Aucun sous-symbole éclaté pour ce plan-repère.";
            conteneurComposants.appendChild(aucunMsg);
        } else {
            let wrapperCol = document.createElement('div');
            wrapperCol.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

            composantsPlan.forEach(c => {
                let imgSymbUrl = c.symbole ? `${GITHUB_IMG_URL}${c.symbole}.jpg` : '';
                
                // Recherche plus souple du stock pour ce symbole (nettoyage des espaces et minuscules)
                let cleanSyC = String(c.symbole || "").trim().toLowerCase();
                let stockSy = stockGlobal.filter(s => {
                    let cleanSyStock = String(s.symbole || "").trim().toLowerCase();
                    let cleanPlanStock = String(s.plan || "").trim();
                    let cleanPlanItem = String(c.plan || "").trim();
                    // On vérifie soit le symbole seul, soit le couple plan + symbole si pertinent
                    return cleanSyStock === cleanSyC;
                });

                let row = document.createElement('div');
                row.style.cssText = "display: flex; align-items: center; background: #f8f9fa; border: 1px solid #ced4da; padding: 8px; border-radius: 6px; gap: 10px; cursor: pointer;";
                
                // Petit effet visuel au survol pour indiquer que c'est interactif
                row.addEventListener('mouseover', () => row.style.background = '#e9ecef');
                row.addEventListener('mouseout',  () => row.style.background = '#f8f9fa');

                // Permettre de sélectionner ce symbole pour faire un mouvement direct si besoin
                row.addEventListener('click', () => {
                    let saisieSym = document.getElementById('inputSymbole');
                    if (saisieSym) saisieSym.value = c.symbole;
                    // On peut aussi pré-remplir l'intitulé ou l'article courant si tu souhaites faire un mouvement dessus
                    console.log("Symbole sélectionné pour action :", c.symbole);
                });

                let imgHtml = `<img src="${imgSymbUrl}" style="width: 70px; height: 50px; object-fit: contain; border-radius: 4px; border: 1px solid #ccc; background: #fff; flex-shrink: 0;"
                     onerror="this.onerror=null;this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2270%22 height=%2250%22%3E%3Crect width=%2270%22 height=%2250%22 fill=%22%23eee%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%229%22 fill=%22%23999%22%3ENo img%3C/text%3E%3C/svg%3E'">`;

                let designationTexte = c.designation || c.intitule || '';
                let infoHtml = `<div style="flex-grow: 1; font-size: 12px;">
                    <strong style="color: #0056b3; font-size: 13px;">SY : ${c.symbole || '-'}</strong> | Qté requise : <b>${c.quantite || 1}</b><br>
                    <span style="color: #444; display: inline-block; margin: 2px 0;">${designationTexte}</span><br>`;

                if (stockSy.length > 0) {
                    let stockDetails = stockSy.map(st => `📍 Site: <b>${st.site || 'N/A'}</b> | Bât: <b>${st.batiment || 'N/A'}</b> | Rang: <b>${st.rang || 'N/A'}</b> (<b>Qté: ${st.quantite || 0}</b>)`).join('<br>');
                    infoHtml += `<div style="margin-top: 4px; background: #d4edda; color: #155724; padding: 4px 6px; border-radius: 4px; font-size: 11px; border: 1px solid #c3e6cb;">${stockDetails}</div>`;
                } else {
                    infoHtml += `<div style="margin-top: 4px; background: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; font-size: 11px;">⚠️ Aucun stock enregistré pour ce SY</div>`;
                }

                infoHtml += `</div>`;
                row.innerHTML = imgHtml + infoHtml;
                wrapperCol.appendChild(row);
            });

            conteneurComposants.appendChild(wrapperCol);
        }
    }

    // Reset des champs de saisie de stock
    let elSite = document.getElementById('stockSite');
    let elBat  = document.getElementById('stockBatiment');
    let elRang = document.getElementById('stockRang');
    let elQte  = document.getElementById('stockQuantite');
    let elMvt  = document.getElementById('mouvementType');
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
    if (elSite) elSite.value = existant.site     || "";
    if (elBat)  elBat.value  = existant.batiment || "";
    if (elRang) elRang.value = existant.rang     || "";
    let qteInput = document.getElementById('stockQuantite');
    if (qteInput) qteInput.focus();
}

// --- MOUVEMENT DE STOCK ---
function validerMouvementStock() {
    if (!articleCourant) return;

    let typeMvt     = (document.getElementById('mouvementType')   || {value: 'ENTREE'}).value;
    let site        = (document.getElementById('stockSite')       || {value: ''}).value.trim();
    let batiment    = (document.getElementById('stockBatiment')   || {value: ''}).value.trim();
    let rang        = (document.getElementById('stockRang')        || {value: ''}).value.trim();
    let qteDemandee = parseInt((document.getElementById('stockQuantite') || {value: '1'}).value) || 0;

    if (qteDemandee <= 0) {
        alert("⚠️ Quantité invalide. Veuillez saisir un nombre supérieur à 0.");
        return;
    }

    if (!site || !batiment || !rang) {
        alert("⚠️ Veuillez remplir tous les champs d'emplacement (Site, Bâtiment, Rang).");
        return;
    }

    // Gestion du Plan-Repère comme un article/symbole individuel dans le stock
    let index = stockGlobal.findIndex(item =>
        String(item.plan      || "").trim()        === String(articleCourant.plan || "").trim() &&
        String(item.rep       || "").trim()        === String(articleCourant.rep  || "").trim() &&
        (!item.symbole || item.symbole === "")             &&
        String(item.site      || "").toLowerCase() === site.toLowerCase()      &&
        String(item.batiment  || "").toLowerCase() === batiment.toLowerCase() &&
        String(item.rang      || "").toLowerCase() === rang.toLowerCase()
    );

    if (typeMvt === 'ENTREE') {
        if (index !== -1) {
            stockGlobal[index].quantite = (parseInt(stockGlobal[index].quantite) || 0) + qteDemandee;
        } else {
            stockGlobal.push({
                plan:      articleCourant.plan,
                rep:       articleCourant.rep       || "",
                symbole:   "", // Entrée directe sur le plan-repère
                intitule:  articleCourant.intitule  || "",
                site:      site,
                batiment:  batiment,
                rang:      rang,
                quantite:  qteDemandee
            });
        }
    } else {
        if (index === -1) {
            alert("❌ Erreur : cet emplacement n'existe pas en stock pour ce plan-repère.");
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
    let resDiv    = document.getElementById('resultat');
    let inputPlan = document.getElementById('inputPlan');
    let inputRep  = document.getElementById('inputRep');
    let listeRes  = document.getElementById('listePlanResultats');
    if (resDiv)     resDiv.style.display = 'none';
    if (inputPlan)  inputPlan.value = "";
    if (inputRep)   inputRep.value  = "";
    if (listeRes)   listeRes.innerHTML = "";
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
            item.site      || "",
            item.batiment || "",
            item.rang      || "",
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
