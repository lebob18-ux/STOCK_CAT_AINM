// URL de ton dépôt central GitHub structuré avec le dossier IMG_JPG
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

    // Chargement du mapping, du stock (local) et de PELICAN.xlsx depuis MIGNATURE_K1
    Promise.all([
        fetch(GITHUB_BASE_URL + 'mapping.json').then(res => res.json()),
        Promise.resolve(localStorage.getItem('stock_local_sauvegarde')),
        fetch(GITHUB_BASE_URL + 'PELICAN.xlsx').then(res => res.arrayBuffer()).catch(() => null)
    ])
    .then(([catalogueData, stockSauvegarde, pelicanBuffer]) => {
        catalogueGlobal = catalogueData;
        console.log("Catalogue chargé :", catalogueGlobal.length, "articles.");

        if (stockSauvegarde) {
            stockGlobal = JSON.parse(stockSauvegarde);
            console.log("Stock récupéré :", stockGlobal.length, "entrées.");
        }

        if (pelicanBuffer) {
            let data = new Uint8Array(pelicanBuffer);
            let workbook = XLSX.read(data, {type: 'array'});
            let firstSheetName = workbook.SheetNames[0];
            pelicansData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
            console.log("Base PELICAN.xlsx chargée :", pelicansData.length, "lignes.");
        }
    })
    .catch(err => console.error("Erreur de chargement des fichiers :", err));

    // --- ÉCOUTEURS DE SAISIE (Chaque champ est indépendant) ---
    
    // 1. Recherche Pelican uniquement (Dès le 3e caractère)
    const inputPelican = document.getElementById('inputPelican');
    inputPelican.addEventListener('input', (e) => {
        let valeur = e.target.value.trim();
        // On vide les autres champs pour éviter les conflits
        if (valeur.length > 0) {
            document.getElementById('inputSymbole').value = '';
            document.getElementById('suggestions').innerHTML = '';
            document.getElementById('inputPlan').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
        }
        if (valeur.length >= 3) {
            afficherSuggestionsPelican(valeur);
        } else {
            document.getElementById('suggestionsPelican').innerHTML = '';
            document.getElementById('fichePelicanDetail').style.display = 'none';
        }
    });

    // 2. Recherche par Symbole uniquement
    const inputSymbole = document.getElementById('inputSymbole');
    inputSymbole.addEventListener('input', (e) => {
        let valeur = e.target.value.trim();
        if (valeur.length > 0) {
            document.getElementById('inputPelican').value = '';
            document.getElementById('suggestionsPelican').innerHTML = '';
            document.getElementById('fichePelicanDetail').style.display = 'none';
            document.getElementById('inputPlan').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
        }
        if (valeur.length >= 5) {
            afficherSuggestionsSymbole(valeur);
        } else {
            document.getElementById('suggestions').innerHTML = '';
        }
    });

    // Sélection automatique de la quantité au clic
    const inputQuantite = document.getElementById('stockQuantite');
    inputQuantite.addEventListener('focus', function() {
        this.select();
    });
});

// --- GESTION DE LA RECHERCHE PELICAN (Strictement Pelican) ---
function afficherSuggestionsPelican(texte) {
    let container = document.getElementById('suggestionsPelican');
    container.innerHTML = '';
    
    let recherche = texte.toLowerCase();
    
    // On filtre uniquement sur la colonne "pelican" ou "int plan"
    let matches = pelicansData.filter(row => {
        let pelican = String(row["pelican"] || "").toLowerCase();
        let intitule = String(row["int plan"] || "").toLowerCase();
        return pelican.includes(recherche) || intitule.includes(recherche);
    });

    // Garder des codes Pelican uniques
    let pelicansUniques = [...new Map(matches.map(item => [item["pelican"], item])).values()];

    if (pelicansUniques.length === 0) {
        container.innerHTML = '<div style="padding: 10px; color: #777; font-size: 14px;">Aucun Pelican trouvé</div>';
        return;
    }

    pelicansUniques.forEach(item => {
        let div = document.createElement('div');
        div.className = 'suggestion-item';
        
        div.innerHTML = `
            <div style="font-size: 14px; width: 100%;">
                <strong style="color: #0056b3;">Pelican : ${item["pelican"]}</strong> (Plan ref: ${item["plan"]})<br>
                <small style="color: #555;">${item["int plan"] || ''}</small>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.getElementById('inputPelican').value = item["pelican"];
            container.innerHTML = '';
            document.getElementById('suggestions').innerHTML = '';
            document.getElementById('listePlanResultats').innerHTML = '';
            afficherDetailsPelican(item["pelican"]);
        });
        
        container.appendChild(div);
    });
}

function afficherDetailsPelican(codePelican) {
    let composants = pelicansData.filter(row => String(row["pelican"]) === String(codePelican));
    if (composants.length === 0) return;

    let infoPelican = composants[0];
    let divDetail = document.getElementById('fichePelicanDetail');
    divDetail.style.display = 'block';
    document.getElementById('resultat').style.display = 'none';

    let imgKitUrl = `${GITHUB_IMG_URL}${codePelican}.jpg`;

    let html = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
            <img src="${imgKitUrl}" onerror="this.src='https://via.placeholder.com/100x70?text=Kit'" style="width: 90px; height: 65px; object-fit: cover; border-radius: 6px; border: 1px solid #0056b3;">
            <div>
                <h3 style="color: #0056b3; margin:0;">Kit Pelican : ${infoPelican["pelican"]}</h3>
                <p style="margin: 2px 0; font-size: 13px;"><strong>Intitulé :</strong> ${infoPelican["int plan"]}</p>
            </div>
        </div>
        <hr style="margin: 10px 0; border: 0; border-top: 1px solid #ddd;">
        <h4 style="margin: 8px 0; font-size: 14px;">Composition (Vérification des stocks) :</h4>
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto;">
    `;

    composants.forEach(comp => {
        let sy = String(comp["SYMBOLE_ECLATE"] || "").trim();
        let qteRequise = parseInt(comp["QUANTITE"]) || 1;
        let libSy = comp["DESIGNATION"] || "";
        let imgUrl = `${GITHUB_IMG_URL}${sy}.jpg`;

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

// --- RECHERCHE PAR PLAN (Strictement Plan) ---
function rechercherParPlan() {
    let saisie = document.getElementById('inputPlan').value.trim();
    if (!saisie) return;
    
    let planFormate = saisie.padStart(6, '0');
    document.getElementById('inputPlan').value = planFormate;

    // On vide le reste
    document.getElementById('inputSymbole').value = '';
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('inputPelican').value = '';
    document.getElementById('suggestionsPelican').innerHTML = '';
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
        html += `<p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">Plusieurs articles trouvés pour ce plan (Cliquez sur la pièce) :</p>`;
        html += `<div style="display: flex; flex-direction: column; gap: 10px; max-height: 350px; overflow-y: auto;">`;

        correspondances.forEach(article => {
            let imgUrl = `${GITHUB_IMG_URL}${article.symbole}.jpg`;
            let articleJson = JSON.stringify(article).replace(/"/g, '&quot;');
            
            html += `
                <div class="suggestion-item" onclick='selectionnerArticlePlan(${articleJson})' style="cursor: pointer; border: 1px solid #ddd; padding: 8px; border-radius: 6px; display: flex; align-items: center; gap: 12px; background: white;">
                    <img src="${imgUrl}" style="width: 70px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='https://via.placeholder.com/70x50?text=No'">
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
        let imgUrl = `${GITHUB_IMG_URL}${article.symbole}.jpg`;

        div.innerHTML = `
            <img src="${imgUrl}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" onerror="this.src='https://via.placeholder.com/60x45?text=No'">
            <div style="font-size: 14px; margin-left: 10px;">
                <strong style="color: #0056b3;">Symb: ${article.symbole}</strong> (Plan: ${article.plan} / REP: ${article.rep})<br>
                <small style="color: #555; display: inline-block; margin-top: 3px;">${article.intitule}</small>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.getElementById('inputSymbole').value = article.symbole;
            document.getElementById('inputPlan').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
            document.getElementById('inputPelican').value = '';
            document.getElementById('suggestionsPelican').innerHTML = '';
            document.getElementById('fichePelicanDetail').style.display = 'none';
            container.innerHTML = '';
            afficherFiche(article);
        });
        
        container.appendChild(div);
    });
}

// --- AFFICHAGE DE LA FICHE ARTICLE & STOCK ---
function afficherFiche(article) {
    articleCourant = article;
    document.getElementById('resPlan').textContent = article.plan;
    document.getElementById('resRep').textContent = article.rep;
    document.getElementById('resSymbole').textContent = article.symbole;
    document.getElementById('resIntitule').textContent = article.intitule;

    let img = document.getElementById('imgPiece');
    img.src = `${GITHUB_IMG_URL}${article.symbole}.jpg`;
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
        
        let htmlStock = `<strong>📦 EMPLACEMENTS EN STOCK (${existants.length}) :</strong><br>
        <p style="font-size: 12px; margin: 4px 0 8px 0;">Cliquez sur un emplacement pour le sélectionner :</p>
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
        divStock.innerHTML = `<strong>⚠️ AUCUN STOCK :</strong> Pièce non référencée. Saisissez l'emplacement pour créer le stock.`;
    }

    document.getElementById('stockSite').value = "";
    document.getElementById('stockBatiment').value = "";
    document.getElementById('stockRang').value = "";
    document.getElementById('stockQuantite').value = "1";
    document.getElementById('mouvementType').value = "ENTREE"; // Par défaut en entrée
    document.getElementById('resultat').style.display = 'block';
}

function selectionnerEmplacementExistant(existant) {
    document.getElementById('stockSite').value = existant.site || existant.Site || "";
    document.getElementById('stockBatiment').value = existant.batiment || existant.Batiment || "";
    document.getElementById('stockRang').value = existant.rang || existant.Rang || "";
    document.getElementById('stockQuantite').focus();
}

// --- VALIDATION ENTRÉE / SORTIE DE STOCK ---
function validerMouvementStock() {
    if (!articleCourant) return;

    let typeMvt = document.getElementById('mouvementType').value; // 'ENTREE' ou 'SORTIE'
    let site = document.getElementById('stockSite').value.trim();
    let batiment = document.getElementById('stockBatiment').value.trim();
    let rang = document.getElementById('stockRang').value.trim();
    let qte = parseInt(document.getElementById('stockQuantite').value) || 0;

    if (!site || !batiment || !rang) {
        alert("Veuillez remplir ou sélectionner un emplacement (Site, Bâtiment, Rang).");
        return;
    }
    if (qte <= 0) {
        alert("Veuillez indiquer une quantité valide.");
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

    if (typeMvt === 'ENTREE') {
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
    } else { // SORTIE
        if (index === -1) {
            alert("Impossible de faire une sortie : cet emplacement n'existe pas dans le stock !");
            return;
        }
        let currentQte = parseInt(stockGlobal[index].quantite || stockGlobal[index].Quantité) || 0;
        if (qte > currentQte) {
            alert(`Stock insuffisant ! Quantité actuelle sur cet emplacement : ${currentQte}`);
            return;
        }
        stockGlobal[index].quantite = currentQte - qte;

        // Optionnel : si la quantité tombe à 0, on peut nettoyer ou laisser à 0
    }

    // Sauvegarde locale
    localStorage.setItem('stock_local_sauvegarde', JSON.stringify(stockGlobal));

    // Réinitialisation propre
    document.getElementById('resultat').style.display = 'none';
    document.getElementById('inputPlan').value = "";
    document.getElementById('inputSymbole').value = "";
    document.getElementById('inputPelican').value = "";
    document.getElementById('listePlanResultats').innerHTML = "";
    document.getElementById('suggestions').innerHTML = "";
    document.getElementById('suggestionsPelican').innerHTML = "";
    document.getElementById('fichePelicanDetail').style.display = 'none';
    articleCourant = null;

    alert(typeMvt === 'ENTREE' ? "Entrée de stock enregistrée avec succès !" : "Sortie de stock enregistrée avec succès !");
}
