// URL de votre dépôt central de miniatures GitHub
const GITHUB_MINIATURES_URL = "https://raw.githubusercontent.com/lebob18-ux/MIGNATURE_K1/main/";

let catalogueGlobal = []; 
let stockGlobal = [];     
let articleCourant = null;

window.addEventListener('DOMContentLoaded', () => {
    // 1. Chargement simultané du mapping.json et du stock_global.csv depuis GitHub
    Promise.all([
        fetch('mapping.json').then(res => res.json()),
        fetch('stock_global.csv').then(res => res.text()).catch(() => "")
    ])
    .then(([catalogueData, csvText]) => {
        catalogueGlobal = catalogueData;
        console.log("Catalogue chargé :", catalogueGlobal.length, "articles.");

        if (csvText) {
            stockGlobal = parserCSVEnTableau(csvText);
            console.log("Stock global GitHub chargé :", stockGlobal.length, "entrées.");
        }
    })
    .catch(err => console.error("Erreur de chargement des fichiers :", err));

    // Gestion du basculement des champs de saisie
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
            container.innerHTML = '';
            afficherFiche(article);
        });
        
        container.appendChild(div);
    });
}

// --- AFFICHAGE DE LA FICHE & STOCK ACTUEL ---
function afficherFiche(article) {
    articleCourant = article;
    document.getElementById('resPlan').textContent = article.plan;
    document.getElementById('resRep').textContent = article.rep;
    document.getElementById('resSymbole').textContent = article.symbole;
    document.getElementById('resIntitule').textContent = article.intitule;

    let img = document.getElementById('imgPiece');
    img.src = `${GITHUB_MINIATURES_URL}${article.symbole}.jpg`;
    img.onerror = () => img.src = 'https://via.placeholder.com/160x120?text=Introuvable';

    let existant = stockGlobal.find(item => item.symbole === article.symbole && item.rep === article.rep);
    let divStock = document.getElementById('infoStockActuel');
    
    if (existant) {
        divStock.style.display = 'block';
        divStock.style.backgroundColor = '#d4edda';
        divStock.style.border = '1px solid #c3e6cb';
        divStock.style.color = '#155724';
        divStock.innerHTML = `<strong>📦 PIÈCE EN STOCK :</strong><br>
            📍 Site : <b>${existant.site}</b> | Bât : <b>${existant.batiment}</b><br>
            📍 Rang : <b>${existant.rang}</b><br>
            📊 Quantité : <strong style="font-size:1.1rem;">${existant.quantite}</strong>`;
        
        document.getElementById('stockSite').value = existant.site;
        document.getElementById('stockBatiment').value = existant.batiment;
        document.getElementById('stockRang').value = existant.rang;
    } else {
        divStock.style.display = 'block';
        divStock.style.backgroundColor = '#fff3cd';
        divStock.style.border = '1px solid #ffeeba';
        divStock.style.color = '#856404';
        divStock.innerHTML = `<strong>⚠️ AUCUN STOCK :</strong> Pièce non référencée.`;
        
        document.getElementById('stockSite').value = "";
        document.getElementById('stockBatiment').value = "";
        document.getElementById('stockRang').value = "";
    }

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
    document.getElementById('modalExistant').style.display = 'none';
    document.getElementById('resultat').style.display = 'none';
    
    document.getElementById('inputPlan').value = "";
    document.getElementById('inputSymbole').value = "";
    document.getElementById('listePlanResultats').innerHTML = "";
    document.getElementById('suggestions').innerHTML = "";
    articleCourant = null;

    alert(message + "\n\nN'oubliez pas d'exporter et de mettre à jour le fichier stock_global.csv sur GitHub !");
}

function echapperCSV(texte) {
    if (!texte) return '""';
    let textePropre = String(texte).replace(/"/g, '""');
    return `"${textePropre}"`;
}

// --- EXPORT CSV GLOBAL (Pour mettre à jour GitHub) ---
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

// --- PARSER CSV DEPUIS GITHUB ---
function parserCSVEnTableau(texte) {
    let lignes = texte.split('\n');
    let resultat = [];
    
    for (let i = 1; i < lignes.length; i++) {
        let ligne = lignes[i].trim();
        if (!ligne) continue;
        
        let donnees = [];
        let entreGuillemets = false;
        let valeurCourante = "";
        
        for (let j = 0; j < ligne.length; j++) {
            let char = ligne[j];
            if (char === '"' && ligne[j+1] === '"') { 
                valeurCourante += '"'; 
                j++; 
            } else if (char === '"') { 
                entreGuillemets = !entreGuillemets; 
            } else if (char === ',' && !entreGuillemets) { 
                donnees.push(valeurCourante); 
                valeurCourante = ""; 
            } else { 
                valeurCourante += char; 
            }
        }
        donnees.push(valeurCourante);
        
        if (donnees.length >= 8) {
            resultat.push({
                plan: donnees[0],
                rep: donnees[1],
                symbole: donnees[2],
                intitule: donnees[3],
                site: donnees[4],
                batiment: donnees[5],
                rang: donnees[6],
                quantite: parseInt(donnees[7]) || 0
            });
        }
    }
    return resultat;
}
// --- ENVOI DU STOCK PAR E-MAIL ---
function envoyerStockParEmail() {
    if (stockGlobal.length === 0) {
        alert("Aucune donnée de stock à envoyer.");
        return;
    }

    // 1. Génération du contenu CSV
    let csvContent = "plan,rep,symbole,intitule,site,batiment,rang,quantite\n";
    stockGlobal.forEach(item => {
        csvContent += `${item.plan},${item.rep},${item.symbole},${echapperCSV(item.intitule)},${echapperCSV(item.site)},${echapperCSV(item.batiment)},${echapperCSV(item.rang)},${item.quantite}\n`;
    });

    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 2. Vérification si le navigateur mobile supporte le partage direct de fichiers (Fichiers joints réels)
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], "stock_global.csv", { type: "text/csv" })] })) {
        let fichier = new File([blob], "stock_global.csv", { type: "text/csv" });
        navigator.share({
            title: 'Mise à jour Stock Terrain',
            text: 'Voici le fichier de mise à jour du stock suite au rangement.',
            files: [fichier]
        }).catch(err => console.log("Partage annulé", err));
    } else {
        // 3. Fallback : Ouvre le client mail (Outlook/Gmail) avec le texte pré-rempli si le partage de fichier direct n'est pas dispo sur le mobile
        let emailDestinataire = "robert.lavignon@sncf.fr"; // ⚠️ Mettez votre email ici
        let sujet = encodeURIComponent("Mise à jour stock terrain");
        let corps = encodeURIComponent("Bonjour,\n\nVoici les dernières modifications de stock réalisées sur le terrain.\n\n(Copiez-collez le contenu de votre fichier si nécessaire ou utilisez la fonction de partage).");
        
        // Télécharge aussi le fichier par sécurité pour que le technicien puisse l'attacher facilement
        let url = URL.createObjectURL(blob);
        let link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "stock_global.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Ouvre le mail
        window.location.href = `mailto:${emailDestinataire}?subject=${sujet}&body=${corps}`;
        alert("Le fichier 'stock_global.csv' a été téléchargé sur votre téléphone et votre application mail va s'ouvrir. Pensez à joindre le fichier au message !");
    }
}
