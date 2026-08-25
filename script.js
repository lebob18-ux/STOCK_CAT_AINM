const GITHUB_BASE_URL = "https://raw.githubusercontent.com/lebob18-ux/MIGNATURE_K1/main/";
const GITHUB_IMG_URL = GITHUB_BASE_URL + "IMG_JPG/";

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('btnInstaller').style.display = 'block';
});

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.getElementById('btnInstaller').style.display = 'none';
});

function installerApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((result) => {
        if (result.outcome === 'accepted') {
            document.getElementById('btnInstaller').style.display = 'none';
        }
        deferredPrompt = null;
    });
}

let cataloguePlanGlobal = []; // Provient de PELICAN.xlsx
let catalogueSymboleGlobal = []; // Provient de mapping.json
let stockGlobal = [];      
let articleCourant = null;

window.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("Service Worker non enregistré"));
    }

    // Chargement des deux sources distinctes (via GitHub) et du stock local
    Promise.all([
        // 1. Chargement de PELICAN.xlsx pour les plans
        fetch(GITHUB_BASE_URL + 'PELICAN.xlsx')
            .then(res => res.arrayBuffer())
            .then(buffer => {
                let workbook = XLSX.read(buffer, { type: 'array' });
                let premiereFeuille = workbook.SheetNames[0];
                let donneesBrutes = XLSX.utils.sheet_to_json(workbook.Sheets[premiereFeuille]);
                
                return donneesBrutes.map(row => ({
                    pelican: String(row.pelican || "").trim(),
                    plan: String(row.plan || "").trim(),
                    intitule: String(row['int plan'] || "").trim(),
                    symbole: String(row.SYMBOLE_ECLATE || "").trim(),
                    quantite: parseInt(row.QUANTITE) || 1,
                    designation: String(row.DESIGNATION || "").trim(),
                    rep: "" 
                })).filter(item => item.plan !== "");
            })
            .catch(err => {
                console.error("Erreur de chargement de PELICAN.xlsx :", err);
                return [];
            }),

        // 2. Chargement de mapping.json pour les symboles
        fetch(GITHUB_BASE_URL + 'mapping.json')
            .then(res => res.json())
            .catch(err => {
                console.error("Erreur de chargement de mapping.json :", err);
                return [];
            }),

        // 3. Récupération du stock local
        Promise.resolve(localStorage.getItem('stock_local_sauvegarde'))
    ])
    .then(([planData, symboleData, stockSauvegarde]) => {
        cataloguePlanGlobal = planData;
        catalogueSymboleGlobal = symboleData;
        console.log("PELICAN.xlsx chargé :", cataloguePlanGlobal.length, "lignes.");
        console.log("mapping.json chargé :", catalogueSymboleGlobal.length, "lignes.");

        if (stockSauvegarde) {
            stockGlobal = JSON.parse(stockSauvegarde);
            console.log("Stock récupéré :", stockGlobal.length, "entrées.");
        }
    })
    .catch(err => console.error("Erreur critique au démarrage :", err));

    // --- ÉCOUTEUR SUR LE CHAMP PLAN ---
    const inputPlan = document.getElementById('inputPlan');
    inputPlan.addEventListener('input', (e) => {
        let valeur = e.target.value.trim();
        
        if (valeur.length > 0) {
            document.getElementById('inputSymbole').value = '';
            document.getElementById('suggestions').innerHTML = '';
            document.getElementById('resultat').style.display = 'none';
        }

        if (valeur.length >= 3) {
            afficherSuggestionsPlan(valeur);
        } else {
            document.getElementById('listePlanResultats').innerHTML = '';
        }
    });

    // Recherche par Symbole
    const inputSymbole = document.getElementById('inputSymbole');
    inputSymbole.addEventListener('input', (e) => {
        let valeur = e.target.value.trim();
        if (valeur.length > 0) {
            document.getElementById('inputPlan').value = '';
            document.getElementById('inputRep').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
            document.getElementById('resultat').style.display = 'none';
        }
        if (valeur.length >= 5) {
            afficherSuggestionsSymbole(valeur);
        } else {
            document.getElementById('suggestions').innerHTML = '';
        }
    });

    document.getElementById('stockQuantite').addEventListener('focus', function() {
        this.select();
    });
});

// --- SUGGESTIONS DE PLANS ---
function afficherSuggestionsPlan(texte) {
    let container = document.getElementById('listePlanResultats');
    container.innerHTML = '';

    let recherche = texte.toLowerCase();
    let matches = cataloguePlanGlobal.filter(item => String(item.plan || "").toLowerCase().includes(recherche));

    let plansUniques = [...new Map(matches.map(item => [item.plan, item])).values()]
        .sort((a, b) => a.plan.localeCompare(b.plan))
        .slice(0, 10);

    if (plansUniques.length === 0) {
        container.innerHTML = '<div style="padding: 8px; color: #777; font-size: 13px; background: white; border: 1px solid #ddd;">Aucun plan trouvé</div>';
        return;
    }

    let html = `<div style="background: white; border: 1px solid #ccc; border-radius: 4px; max-height: 250px; overflow-y: auto; margin-top: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">`;
    
    plansUniques.forEach(article => {
        let artJson = JSON.stringify(article).replace(/"/g, '&quot;');
        html += `
            <div onclick='selectionnerPlanDansListe(${artJson})' style="padding: 8px 12px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 14px;" onmouseover="this.style.background='#f1f8ff'" onmouseout="this.style.background='white'">
                <strong>Plan : ${article.plan}</strong> — <small style="color: #555;">${article.intitule || ''}</small>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function selectionnerPlanDansListe(article) {
    document.getElementById('inputPlan').value = article.plan;
    document.getElementById('inputRep').value = article.rep || '';
    document.getElementById('listePlanResultats').innerHTML = '';
    afficherFiche(article);
}

// --- RECHERCHE MANUELLE PLAN ---
function rechercherPlanRepere() {
    let brutPlan = document.getElementById('inputPlan').value.trim();

    if (!brutPlan) {
        alert("⚠️ Veuillez renseigner le Plan.");
        return;
    }

    document.getElementById('inputSymbole').value = '';
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('listePlanResultats').innerHTML = '';

    let correspondances = cataloguePlanGlobal.filter(item => item.plan.toLowerCase().includes(brutPlan.toLowerCase()));

    if (correspondances.length === 0) {
        alert("❌ Aucun article trouvé pour ce Plan.");
        document.getElementById('resultat').style.display = 'none';
        return;
    }

    afficherFiche(correspondances[0]);
}

// --- RECHERCHE PAR SYMBOLE ---
function afficherSuggestionsSymbole(prefixe) {
    let container = document.getElementById('suggestions');
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
            <img src="${imgUrl}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" onerror="this.src='https://via.placeholder.com/60x45?text=No'">
            <div style="font-size: 14px; margin-left: 10px;">
                <strong style="color: #0056b3;">Symb: ${article.symbole}</strong> (Plan: ${article.plan} / REP: ${article.rep})<br>
                <small style="color: #555; display: inline-block; margin-top: 3px;">${article.intitule}</small>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.getElementById('inputSymbole').value = article.symbole;
            document.getElementById('inputPlan').value = article.plan;
            document.getElementById('inputRep').value = article.rep || '';
            document.getElementById('suggestions').innerHTML = '';
            afficherFiche(article);
        });
        
        container.appendChild(div);
    });
}

// --- AFFICHAGE DE LA FICHE ---
function afficherFiche(article) {
    articleCourant = article;
    document.getElementById('resPlan').textContent = article.plan;
    document.getElementById('resRep').textContent = article.rep || '-';
    document.getElementById('resSymbole').textContent = article.symbole || '-';
    document.getElementById('resIntitule').textContent = article.intitule || '-';

    let img = document.getElementById('imgPiece');
    let cleImage = article.pelican || article.symbole;
    img.src = cleImage ? `${GITHUB_IMG_URL}${cleImage}.jpg` : '';
    img.onerror = () => img.src = 'https://via.placeholder.com/160x120?text=Introuvable';

    let existants = stockGlobal.filter(item => 
        String(item.plan || "").trim() === article.plan
    );
    let divStock = document.getElementById('infoStockActuel');
    
    if (existants.length > 0) {
        divStock.style.display = 'block';
        divStock.style.backgroundColor = '#d4edda';
        divStock.style.border = '1px solid #c3e6cb';
        divStock.style.color = '#155724';
        
        let htmlStock = `<strong>📦 EMPLACEMENTS EN STOCK (${existants.length}) :</strong><br>
        <p style="font-size: 12px; margin: 4px 0 8px 0;">Cliquez pour sélectionner :</p>
        <div style="display: flex; flex-direction: column; gap: 6px;">`;
        
        existants.forEach((ex) => {
            let exJson = JSON.stringify(ex).replace(/"/g, '&quot;');
            htmlStock += `
                <div onclick='selectionnerEmplacementExistant(${exJson})' style="cursor: pointer; background: white; border: 1px solid #28a745; padding: 6px 10px; border-radius: 4px; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
                    <div>📍 Site: <b>${ex.site || ''}</b> | Bât: <b>${ex.batiment || ''}</b> | Rang: <b>${ex.rang || ''}</b></div>
                    <div style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Qte: ${ex.quantite || 0}</div>
                </div>
            `;
        });
        htmlStock += `</div>`;
        divStock.innerHTML = htmlStock;
    } else {
        divStock.style.display = 'block';
        divStock.style.backgroundColor = '#fff3cd';
        divStock.style.border = '1px solid #ffeeba';
        divStock.style.color = '#856404';
        divStock.innerHTML = `<strong>⚠️ AUCUN STOCK :</strong> Saisissez l'emplacement pour créer le stock.`;
    }

    document.getElementById('stockSite').value = "";
    document.getElementById('stockBatiment').value = "";
    document.getElementById('stockRang').value = "";
    document.getElementById('stockQuantite').value = "1";
    document.getElementById('mouvementType').value = "ENTREE";
    document.getElementById('resultat').style.display = 'block';
}

function selectionnerEmplacementExistant(existant) {
    document.getElementById('stockSite').value = existant.site || "";
    document.getElementById('stockBatiment').value = existant.batiment || "";
    document.getElementById('stockRang').value = existant.rang || "";
    document.getElementById('stockQuantite').focus();
}

// --- MOUVEMENT DE STOCK ---
function validerMouvementStock() {
    if (!articleCourant) return;

    let typeMvt = document.getElementById('mouvementType').value;
    let site = document.getElementById('stockSite').value.trim();
    let batiment = document.getElementById('stockBatiment').value.trim();
    let rang = document.getElementById('stockRang').value.trim();
    let qteDemandee = parseInt(document.getElementById('stockQuantite').value) || 0;

    if (qteDemandee <= 0) {
        alert("⚠️ Quantité invalide. Veuillez saisir un nombre supérieur à 0.");
        return;
    }

    // SORTIE GLOBALE D'UN MONTAGE
    if (typeMvt === 'SORTIE' && confirm("Confirmez-vous la sortie globale de TOUTES les pièces composant ce plan ?")) {
        let piecesMontage = cataloguePlanGlobal.filter(item => item.plan === articleCourant.plan);
        
        if (piecesMontage.length === 0) {
            alert("❌ Erreur : aucun composant trouvé pour ce plan dans PELICAN.");
            return;
        }

        for (let piece of piecesMontage) {
            let indexStock = stockGlobal.findIndex(s => s.plan === piece.plan && s.symbole === piece.symbole);
            if (indexStock !== -1) {
                stockGlobal[indexStock].quantite = Math.max(0, (parseInt(stockGlobal[indexStock].quantite) || 0) - qteDemandee);
            }
        }

        localStorage.setItem('stock_local_sauvegarde', JSON.stringify(stockGlobal));
        document.getElementById('resultat').style.display = 'none';
        document.getElementById('inputPlan').value = "";
        document.getElementById('inputRep').value = "";
        document.getElementById('listePlanResultats').innerHTML = "";
        articleCourant = null;
        alert("✅ Sortie globale du montage effectuée avec succès !");
        return;
    }

    // MOUVEMENT CLASSIQUE
    if (!site || !batiment || !rang) {
        alert("⚠️ Veuillez remplir tous les champs d'emplacement (Site, Bâtiment, Rang).");
        return;
    }

    let index = stockGlobal.findIndex(item => 
        String(item.plan || "").trim() === articleCourant.plan && 
        String(item.site || "").toLowerCase() === site.toLowerCase() && 
        String(item.batiment || "").toLowerCase() === batiment.toLowerCase() && 
        String(item.rang || "").toLowerCase() === rang.toLowerCase()
    );

    if (typeMvt === 'ENTREE') {
        if (index !== -1) {
            stockGlobal[index].quantite = (parseInt(stockGlobal[index].quantite) || 0) + qteDemandee;
        } else {
            stockGlobal.push({
                plan: articleCourant.plan,
                rep: articleCourant.rep || "",
                symbole: articleCourant.symbole || "",
                intitule: articleCourant.intitule || "",
                site: site,
                batiment: batiment,
                rang: rang,
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

    document.getElementById('resultat').style.display = 'none';
    document.getElementById('inputPlan').value = "";
    document.getElementById('inputRep').value = "";
    document.getElementById('listePlanResultats').innerHTML = "";
    articleCourant = null;

    alert(typeMvt === 'ENTREE' ? "✅ Entrée de stock validée !" : "✅ Sortie de stock validée !");
}

// --- EXPORT DU STOCK (Conservé pour sortir les données si besoin) ---
function exporterStockCSV() {
    if (stockGlobal.length === 0) {
        alert("⚠️ Aucun stock à exporter.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Plan;Rep;Symbole;Intitule;Site;Batiment;Rang;Quantite\n";
    
    stockGlobal.forEach(item => {
        let ligne = [
            item.plan || "",
            item.rep || "",
            item.symbole || "",
            `"${(item.intitule || "").replace(/"/g, '""')}"`,
            item.site || "",
            item.batiment || "",
            item.rang || "",
            item.quantite || 0
        ].join(";");
        csvContent += ligne + "\n";
    });

    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "stock_terrain_" + new Date().toISOString().slice(0,10) + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
