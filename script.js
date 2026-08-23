// URL de votre dépôt central de miniatures GitHub
const GITHUB_MINIATURES_URL = "https://raw.githubusercontent.com/lebob18-ux/MIGNATURE_K1/main/";

let catalogueGlobal = []; 
let stockGlobal = [];     
let articleCourant = null;

window.addEventListener('DOMContentLoaded', () => {
    fetch('mapping.json')
        .then(response => response.json())
        .then(data => {
            catalogueGlobal = data;
            console.log("Catalogue chargé :", catalogueGlobal.length, "articles.");
        })
        .catch(err => console.error("Erreur de chargement du mapping.json :", err));

    let localSauvegarde = localStorage.getItem('stock_magasin_local');
    if (localSauvegarde) {
        stockGlobal = JSON.parse(localSauvegarde);
    }

    const inputSymbole = document.getElementById('inputSymbole');
    inputSymbole.addEventListener('input', (e) => {
        let valeur = e.target.value.trim();
        if (valeur.length > 0) {
            document.getElementById('inputPlan').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
        }

        if (valeur.length >= 5) {
            afficherSuggestionsSymbole(valeur);
        } else {
            document.getElementById('suggestions').innerHTML = '';
        }
    });

    const inputPlan = document.getElementById('inputPlan');
    inputPlan.addEventListener('input', () => {
        document.getElementById('inputSymbole').value = '';
        document.getElementById('suggestions').innerHTML = '';
    });
});

// --- RECHERCHE PAR PLAN ---
function rechercherParPlan() {
    let saisie = document.getElementById('inputPlan').value.trim();
    if (!saisie) return;
    
    let planFormate = saisie.padStart(6, '0');
    document.getElementById('inputPlan').value = planFormate;

    document.getElementById('inputSymbole').value = '';
    document.getElementById('suggestions').innerHTML = '';

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
        html += `<p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px;">Plusieurs REP trouvés (Cliquez sur la pièce pour valider) :</p>`;
        html += `<div style="display: flex; flex-direction: column; gap: 10px; max-height: 350px; overflow-y: auto;">`;

        correspondances.forEach(article => {
            let imgUrl = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;
            let articleJson = JSON.stringify(article).replace(/"/g, '&quot;');
            
            // Miniature agrandie à 80px de haut/large
            html += `
                <div class="suggestion-item" onclick='selectionnerArticlePlan(${articleJson})' style="cursor: pointer; border: 1px solid #ddd; padding: 8px; border-radius: 6px; display: flex; align-items: center; gap: 15px; background: white;">
                    <img src="${imgUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" onerror="this.src='https://via.placeholder.com/80?text=No'">
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

        // Miniature suggestion agrandie à 70px
        div.innerHTML = `
            <img src="${imgUrl}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" onerror="this.src='https://via.placeholder.com/70?text=No'">
            <div style="font-size: 14px;">
                <strong style="color: #0056b3;">Symb: ${article.symbole}</strong> (Plan: ${article.plan} / REP: ${article.rep})<br>
                <small style="color: #555; display: inline-block; margin-top: 3px;">${article.intitule}</small>
            </div>
        `;
        
        div.addEventListener('click', () => {
            document.getElementById('inputSymbole').value = article.symbole;
            document.getElementById('inputPlan').value = '';
            document.getElementById('listePlanResultats').innerHTML = '';
            container.innerHTML = '';
            afficherFiche(article);
        });
        
        container.appendChild(div);
    });
}

// --- AFFICHAGE DE LA FICHE ---
function afficherFiche(article) {
    articleCourant = article;
    document.getElementById('resPlan').textContent = article.plan;
    document.getElementById('resRep').textContent = article.rep;
    document.getElementById('resSymbole').textContent = article.symbole;
    document.getElementById('resIntitule').textContent = article.intitule;

    let img = document.getElementById('imgPiece');
    img.src = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;
    img.onerror = () => img.src = 'https://via.placeholder.com/180?text=Introuvable';

    document.getElementById('stockSite').value = "";
    document.getElementById('stockBatiment').value = "";
    document.getElementById('stockRang').value = "";
    document.getElementById('stockQuantite').value = "1";

    document.getElementById('resultat').style.display = 'block';
}

// --- VALIDATION & DOUBLONS ---
function validerStockage() {
    if (!articleCourant) return;

    let site = document.getElementById('stockSite').value.trim();
    let batiment = document.getElementById('stockBatiment').value.trim();
    let rang = document.getElementById('stockRang').value.trim();
    let qte = parseInt(document.getElementById('stockQuantite').value) || 0;

    if (!site || !batiment || !rang) {
        alert("Veuillez remplir tous les champs de localisation (Site, Bâtiment, Rang).");
        return;
    }

    let existant = stockGlobal.find(item => item.symbole === articleCourant.symbole && item.rep === articleCourant.rep);

    if (existant) {
        document.getElementById('modalTexteInfo').innerHTML = `
            L'article <b>${articleCourant.symbole}</b> (REP: ${article.rep}) est déjà enregistré à l'emplacement :<br>
            <u>Site:</u> ${existant.site} / <u>Bât.:</u> ${existant.batiment} / <u>Rang:</u> ${existant.rang}<br>
            Quantité actuelle en stock : <b>${existant.quantite}</b>.<br><br>
            Voulez-vous ajouter <b>+${qte}</b> au même endroit ou placer la suite ailleurs ?
        `;
        document.getElementById('modalExistant').style.display = 'flex';
    } else {
        sauvegarderLigneStock(site, batiment, rang, qte, false);
    }
}

function fusionnerQuantite() {
    let qteAjout = parseInt(document.getElementById('stockQuantite').value) || 0;
    let existant = stockGlobal.find(item => item.symbole === articleCourant.symbole && item.rep === articleCourant.rep);
    if (existant) {
        existant.quantite += qteAjout;
        persisterEtFermer("Quantité mise à jour avec succès !");
    }
}

function forcerNouvelEmplacement() {
    let site = document.getElementById('stockSite').value.trim();
    let batiment = document.getElementById('stockBatiment').value.trim();
    let rang = document.getElementById('stockRang').value.trim();
    let qte = parseInt(document.getElementById('stockQuantite').value) || 0;
    sauvegarderLigneStock(site, batiment, rang, qte, true);
}

function sauvegarderLigneStock(site, batiment, rang, qte, remplacer) {
    let index = stockGlobal.findIndex(item => item.symbole === articleCourant.symbole && item.rep === articleCourant.rep);
    
    let nouvelleEntree = {
        plan: articleCourant.plan,
        rep: articleCourant.rep,
        symbole: articleCourant.symbole,
        intitule: articleCourant.intitule,
        site: site,
        batiment: batiment,
        rang: rang,
        quantite: qte
    };

    if (index !== -1 && remplacer) {
        stockGlobal[index] = nouvelleEntree;
    } else if (index === -1) {
        stockGlobal.push(nouvelleEntree);
    }

    persisterEtFermer("Enregistrement effectué !");
}

function persisterEtFermer(message) {
    localStorage.setItem('stock_magasin_local', JSON.stringify(stockGlobal));
    document.getElementById('modalExistant').style.display = 'none';
    document.getElementById('resultat').style.display = 'none';
    
    document.getElementById('inputPlan').value = "";
    document.getElementById('inputSymbole').value = "";
    document.getElementById('listePlanResultats').innerHTML = "";
    document.getElementById('suggestions').innerHTML = "";
    articleCourant = null;

    alert(message);
}

function echapperCSV(texte) {
    if (!texte) return '""';
    let textePropre = String(texte).replace(/"/g, '""');
    return `"${textePropre}"`;
}

// --- EXPORT CSV GLOBAL ---
function exporterStockGlobalCSV() {
    if (stockGlobal.length === 0) {
        alert("Aucune donnée de stock à exporter.");
        return;
    }

    let csvContent = "plan,rep,symbole,intitule,site,batiment,rang,quantite\n";
    stockGlobal.forEach(item => {
        csvContent += `${item.plan},${item.rep},${item.symbole},${echapperCSV(item.intitule)},${echapperCSV(item.site)},${echapperCSV(item.batiment)},${echapperCSV(item.rang)},${item.quantite}\n`;
    });

    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "stock_global.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
