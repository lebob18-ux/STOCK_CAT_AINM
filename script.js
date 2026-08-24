// URL de votre dépôt central de miniatures GitHub
const GITHUB_MINIATURES_URL = "https://raw.githubusercontent.com/lebob18-ux/MIGNATURE_K1/main/";
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

let catalogueGlobal = []; 
let stockGlobal = [];      
let pelicansData = [];     // Données lues depuis PELICAN.xlsx
let articleCourant = null;

window.addEventListener('DOMContentLoaded', () => {
    // --- ENREGISTREMENT DU SERVICE WORKER (PWA) ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker enregistré !', reg.scope))
            .catch(err => console.log('Erreur Service Worker :', err));
    }

    // Chargement du mapping, du stock (local) et de PELICAN.xlsx
    Promise.all([
        fetch(GITHUB_MINIATURES_URL + 'mapping.json').then(res => res.json()),
        Promise.resolve(localStorage.getItem('stock_local_sauvegarde')),
        fetch('./PELICAN.xlsx').then(res => res.arrayBuffer()).catch(() => null)
    ])
    .then(([catalogueData, stockSauvegarde, pelicanBuffer]) => {
        catalogueGlobal = catalogueData;
        console.log("Catalogue chargé :", catalogueGlobal.length, "articles.");

        // Gestion du stock
        if (stockSauvegarde) {
            stockGlobal = JSON.parse(stockSauvegarde);
            console.log("Stock récupéré de la mémoire du téléphone :", stockGlobal.length, "entrées.");
        }

        // Traitement de la base PELICAN.xlsx
        if (pelicanBuffer) {
            let data = new Uint8Array(pelicanBuffer);
            let workbook = XLSX.read(data, {type: 'array'});
            let firstSheetName = workbook.SheetNames[0];
            pelicansData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
            console.log("Base PELICAN.xlsx chargée :", pelicansData.length, "lignes.");
        } else {
            console.log("Fichier PELICAN.xlsx introuvable à la racine.");
        }
    })
    .catch(err => console.error("Erreur de chargement des fichiers :", err));

    // --- ÉCOUTEURS DE SAISIE ---
    
    // 1. Recherche Pelican / Plan-repère (Dès le 3e caractère)
    const inputPelican = document.getElementById('inputPelican');
    inputPelican.addEventListener('input', (e) => {
        let valeur = e.target.value.trim();
        if (valeur.length >= 3) {
            afficherSuggestionsPelican(valeur);
        } else {
            document.getElementById('suggestionsPelican').innerHTML = '';
        }
    });

    // 2. Recherche par Symbole (Dès le 5e chiffre)
    const inputSymbole = document.getElementById('inputSymbole');
    inputSymbole.addEventListener('input', (e) => {
        let valeur = e.target.value.trim();
        if (valeur.length > 0) {
            document.getElementById('inputPlan').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
            document.getElementById('inputPelican').value = '';
            document.getElementById('fichePelicanDetail').style.display = 'none';
        }

        if (valeur.length >= 5) {
            afficherSuggestionsSymbole(valeur);
        } else {
            document.getElementById('suggestions').innerHTML = '';
        }
    });

    // 3. Recherche par Plan
    const inputPlan = document.getElementById('inputPlan');
    inputPlan.addEventListener('input', () => {
        document.getElementById('inputSymbole').value = '';
        document.getElementById('suggestions').innerHTML = '';
        document.getElementById('inputPelican').value = '';
        document.getElementById('fichePelicanDetail').style.display = 'none';
    });

    // Sélection automatique de la quantité au clic
    const inputQuantite = document.getElementById('stockQuantite');
    inputQuantite.addEventListener('focus', function() {
        this.select();
    });
});

// --- GESTION DE LA RECHERCHE PELICAN ---
function afficherSuggestionsPelican(texte) {
    let container = document.getElementById('suggestionsPelican');
    container.innerHTML = '';
    
    let recherche = texte.toLowerCase();
    
    let matches = pelicansData.filter(row => {
        let pelican = String(row["pelican"] || "").toLowerCase();
        let plan = String(row["plan"] || "").toLowerCase();
        return pelican.includes(recherche) || plan.includes(recherche);
    });

    let pelicansUniques = [...new Map(matches.map(item => [item["pelican"], item])).values()];

    if (pelicansUniques.length === 0) {
        container.innerHTML = '<div style="padding: 10px; color: #777; font-size: 14px;">Aucun Pelican ou plan trouvé</div>';
        return;
    }

    pelicansUniques.forEach(item => {
        let div = document.createElement('div');
        div.className = 'suggestion-item';
        
        div.innerHTML = `
            <div style="font-size: 14px; width: 100%;">
                <strong style="color: #0056b3;">Pelican : ${item["pelican"]}</strong> (Plan: ${item["plan"]})<br>
                <small style="color: #555;">${item["int plan"] || ''}</small>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.getElementById('inputPelican').value = item["pelican"];
            document.getElementById('inputPlan').value = '';
            document.getElementById('inputSymbole').value = '';
            document.getElementById('suggestions').innerHTML = '';
            container.innerHTML = '';
            afficherDetailsPelican(item["pelican"]);
        });
        
        container.appendChild(div);
    });
}

// Affichage du kit Pelican complet et vérification des stocks composants
function afficherDetailsPelican(codePelican) {
    let composants = pelicansData.filter(row => String(row["pelican"]) === String(codePelican));
    if (composants.length === 0) return;

    let infoPelican = composants[0];
    let divDetail = document.getElementById('fichePelicanDetail');
    divDetail.style.display = 'block';
    
    document.getElementById('resultat').style.display = 'none';

    let html = `
        <h3 style="color: #0056b3; margin-top:0;">Kit / Montage : ${infoPelican["pelican"]}</h3>
        <p><strong>Plan :</strong> ${infoPelican["plan"]}</p>
        <p><strong>Intitulé :</strong> ${infoPelican["int plan"]}</p>
        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #ddd;">
        <h4 style="margin: 8px 0;">Composition (Symboles requis) :</h4>
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto;">
    `;

    composants.forEach(comp => {
        let sy = String(comp["SYMBOLE_ECLATE"] || "").trim();
        let qteRequise = parseInt(comp["QUANTITE"]) || 1;
        let libSy = comp["DESIGNATION"] || "";
        let imgUrl = `${GITHUB_MINIATURES_URL}${sy}.jpg`;

        let stockTrouve = stockGlobal
            .filter(s => String(s.symbole || s.Symbole || "").trim() === sy)
            .reduce((total, s) => total + (parseInt(s.quantite || s.Quantité) || 0), 0);

        let statusColor = stockTrouve >= qteRequise ? "#d4edda" : "#f8d7da";
        let statusBorder = stockTrouve >= qteRequise ? "#c3e6cb" : "#f5c6cb";
        let statusText = stockTrouve >= qteRequise ? `✅ En stock (${stockTrouve}/${qteRequise})` : `⚠️ Manquant (${stockTrouve}/${qteRequise})`;

        html += `
            <div style="display: flex; align-items: center; gap: 10px; background: ${statusColor}; border: 1px solid ${statusBorder}; padding: 8px; border-radius: 6px;">
                <img src="${imgUrl}" style="width: 70px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc; background: white;" onerror="this.src='https://via.placeholder.com/70x50?text=No'">
                <div style="font-size: 13px; flex: 1;">
                    <strong>Sy: ${sy}</strong> - ${libSy}<br>
                    <span>Requis : <b>${qteRequise}</b></span> | <span style="font-weight: bold;">${statusText}</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    divDetail.innerHTML = html;
}

// --- RECHERCHE PAR PLAN ---
function rechercherParPlan() {
    let saisie = document.getElementById('inputPlan').value.trim();
    if (!saisie) return;
    
    let planFormate = saisie.padStart(6, '0');
    document.getElementById('inputPlan').value = planFormate;

    document.getElementById('inputSymbole').value = '';
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('inputPelican').value = '';
    document.getElementById('fichePelicanDetail').style.display = 'none';

    let correspondances = catalogueGlobal.filter(item => item.plan === planFormate);
    let conteneurListe = document.getElementById('listePlanResultats');
    conteneurListe.innerHTML = '';

    if (correspondances.length === 0) {
        alert("Aucun article trouvé pour le plan : " + planFormate);
        return;
    }

    if (correspondances.length === 1) {
        afficherFiche(correspondances[0]);
    } else {
        let html = `<div style="background: #eef2f7; padding: 12px; border-radius: 6px; margin-top: 10px;">`;
        html += `<p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">Plusieurs REP trouvés (Cliquez sur la pièce) :</p>`;
        html += `<div style="display: flex; flex-direction: column; gap: 10px; max-height: 350px; overflow-y: auto;">`;

        correspondances.forEach(article => {
            let imgUrl = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;
            let articleJson = JSON.stringify(article).replace(/"/g, '&quot;');
            
            html += `
                <div class="suggestion-item" onclick='selectionnerArticlePlan(${articleJson})' style="cursor: pointer; border: 1px solid #ddd; padding: 8px; border-radius: 6px; display: flex; align-items: center; gap: 12px; background: white;">
                    <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/120x90?text=No'">
                    <div style="font-size: 14px;">
                        <strong style="font-size: 15px; color: #0056b3;">REP : ${article.rep}</strong> | Symbole : ${article.symbole}<br>
                        <small style="color: #555; display: inline-block; margin-top: 4px;">${article.intitule}</small>
                    </div>
                </div>
            `;
        });
        html += `</div></div>`;
        conteneurListe.innerHTML = html;
    }
}

function selectionnerArticlePlan(article) {
    document.getElementById('listePlanResultats').innerHTML = ''; 
    document.getElementById('inputPlan').value = article.plan;
    document.getElementById('inputSymbole').value = '';
    afficherFiche(article);
}

// --- RECHERCHE PAR SYMBOLE ---
function afficherSuggestionsSymbole(prefixe) {
    let container = document.getElementById('suggestions');
    container.innerHTML = '';
    
    let matches = catalogueGlobal.filter(item => item.symbole.startsWith(prefixe));

    if (matches.length === 0) {
        container.innerHTML = '<div style="padding: 10px; color: #777; font-size: 14px;">Aucune correspondance</div>';
        return;
    }

    matches.forEach(article => {
        let div = document.createElement('div');
        div.className = 'suggestion-item';
        let imgUrl = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;

        div.innerHTML = `
            <img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/120x90?text=No'">
            <div style="font-size: 14px;">
                <strong style="color: #0056b3;">Symb: ${article.symbole}</strong> (Plan: ${article.plan} / REP: ${article.rep})<br>
                <small style="color: #555; display: inline-block; margin-top: 3px;">${article.intitule}</small>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.getElementById('inputSymbole').value = article.symbole;
            document.getElementById('inputPlan').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
            document.getElementById('inputPelican').value = '';
            document.getElementById('fichePelicanDetail').style.display = 'none';
            container.innerHTML = '';
            afficherFiche(article);
        });
        
        container.appendChild(div);
    });
}

// --- AFFICHAGE DE LA FICHE & SÉLECTION DES EMPLACEMENTS ---
function afficherFiche(article) {
    articleCourant = article;
    document.getElementById('resPlan').textContent = article.plan;
    document.getElementById('resRep').textContent = article.rep;
    document.getElementById('resSymbole').textContent = article.symbole;
    document.getElementById('resIntitule').textContent = article.intitule;

    let img = document.getElementById('imgPiece');
    img.src = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;
    img.onerror = () => img.src = 'https://via.placeholder.com/160x120?text=Introuvable';

    let existants = stockGlobal.filter(item => 
        String(item.symbole || item.Symbole || "").trim() === article.symbole && 
        String(item.rep || item.Rep || "").trim() === article.rep
    );
    let divStock = document.getElementById('infoStockActuel');
    
    if (existants.length > 0) {
        divStock.style.display = 'block';
        divStock.style.backgroundColor = '#d4edda';
        divStock.style.border = '1px solid #c3e6cb';
        divStock.style.color = '#155724';
        
        let htmlStock = `<strong>📦 EMPLACEMENTS EXISTANTS (${existants.length}) :</strong><br>
        <p style="font-size: 12px; margin: 4px 0 8px 0;">Cliquez pour rajouter de la quantité, ou remplissez les champs en bas :</p>
        <div style="display: flex; flex-direction: column; gap: 6px;">`;
        
        existants.forEach((ex) => {
            let exJson = JSON.stringify(ex).replace(/"/g, '&quot;');
            let siteVal = ex.site || ex.Site || "";
            let batVal = ex.batiment || ex.Batiment || "";
            let rangVal = ex.rang || ex.Rang || "";
            let qteVal = ex.quantite || ex.Quantité || 0;

            htmlStock += `
                <div onclick='selectionnerEmplacementExistant(${exJson})' style="cursor: pointer; background: white; border: 1px solid #28a745; padding: 6px 10px; border-radius: 4px; font-size: 13px; display: flex; justify-content: space-between; align-items: center;">
                    <div>📍 Site: <b>${siteVal}</b> | Bât: <b>${batVal}</b> | Rang: <b>${rangVal}</b></div>
                    <div style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Qte: ${qteVal}</div>
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
        divStock.innerHTML = `<strong>⚠️ AUCUN STOCK :</strong> Pièce non référencée. Saisissez l'emplacement ci-dessous.`;
    }

    document.getElementById('stockSite').value = "";
    document.getElementById('stockBatiment').value = "";
    document.getElementById('stockRang').value = "";
    document.getElementById('stockQuantite').value = "1";
    document.getElementById('resultat').style.display = 'block';
}

function selectionnerEmplacementExistant(existant) {
    document.getElementById('stockSite').value = existant.site || existant.Site || "";
    document.getElementById('stockBatiment').value = existant.batiment || existant.Batiment || "";
    document.getElementById('stockRang').value = existant.rang || existant.Rang || "";
    document.getElementById('stockQuantite').focus();
}

// --- VALIDATION DIRECTE ---
function validerStockage() {
    if (!articleCourant) return;

    let site = document.getElementById('stockSite').value.trim();
    let batiment = document.getElementById('stockBatiment').value.trim();
    let rang = document.getElementById('stockRang').value.trim();
    let qte = parseInt(document.getElementById('stockQuantite').value) || 0;

    if (!site || !batiment || !rang) {
        alert("Veuillez remplir tous les champs obligatoires (Site, Bâtiment, Rang) ou cliquer sur un emplacement existant.");
        return;
    }

    let index = stockGlobal.findIndex(item => {
        let sSym = String(item.symbole || item.Symbole || "").trim();
        let sRep = String(item.rep || item.Rep || "").trim();
        let sSite = String(item.site || item.Site || "").trim();
        let sBat = String(item.batiment || item.Batiment || "").trim();
        let sRang = String(item.rang || item.Rang || "").trim();

        return sSym === articleCourant.symbole && 
               sRep === articleCourant.rep && 
               sSite.toLowerCase() === site.toLowerCase() && 
               sBat.toLowerCase() === batiment.toLowerCase() && 
               sRang.toLowerCase() === rang.toLowerCase();
    });

    if (index !== -1) {
        let currentQte = parseInt(stockGlobal[index].quantite || stockGlobal[index].Quantité) || 0;
        stockGlobal[index].quantite = currentQte + qte;
    } else {
        stockGlobal.push({
            plan: articleCourant.plan,
            rep: articleCourant.rep,
            symbole: articleCourant.symbole,
            intitule: articleCourant.intitule,
            site: site,
            batiment: batiment,
            rang: rang,
            quantite: qte
        });
    }

    localStorage.setItem('stock_local_sauvegarde', JSON.stringify(stockGlobal));

    document.getElementById('resultat').style.display = 'none';
    document.getElementById('inputPlan').value = "";
    document.getElementById('inputSymbole').value = "";
    document.getElementById('inputPelican.value') = "";
    document.getElementById('listePlanResultats').innerHTML = "";
    document.getElementById('suggestions').innerHTML = "";
    document.getElementById('suggestionsPelican').innerHTML = "";
    document.getElementById('fichePelicanDetail').style.display = 'none';
    document.getElementById('stockQuantite').value = "1";
    articleCourant = null;
}
