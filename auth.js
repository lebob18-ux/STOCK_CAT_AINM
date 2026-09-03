// Vérification automatique au chargement de la page
document.addEventListener("DOMContentLoaded", async () => {
    await verifierAcces();
});

async function verifierAcces() {
    const savedEmail = localStorage.getItem('user_email_app');

    if (!savedEmail) {
        // Premier passage : on affiche le formulaire de saisie dans l'overlay
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'flex';
        
        const formDemande = document.getElementById('form-demande');
        if (formDemande) formDemande.style.display = 'block';
        
        const attenteValidation = document.getElementById('attente-validation');
        if (attenteValidation) attenteValidation.style.display = 'none';
        return;
    }

    // On interroge Supabase dans la table utilisateurs_K1
    const { data, error } = await supabase
        .from('utilisateurs_K1')
        .select('*')
        .eq('email', savedEmail)
        .single();

    if (error || !data) {
        // L'e-mail n'est plus dans la base ou erreur
        localStorage.removeItem('user_email_app');
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'flex';
        return;
    }

    if (data.valide === true) {
        // ACCÈS AUTORISÉ : On masque l'overlay, l'app est accessible
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'none';
    } else {
        // ACCÈS EN ATTENTE : On bloque avec le message d'attente
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'flex';
        
        const formDemande = document.getElementById('form-demande');
        if (formDemande) formDemande.style.display = 'none';
        
        const attenteValidation = document.getElementById('attente-validation');
        if (attenteValidation) attenteValidation.style.display = 'block';
    }
}

// Fonction appelée quand l'agent clique sur "Demander l'accès"
async function envoyerDemandeAcces() {
    const prenom = document.getElementById('req-prenom').value.trim();
    const nom = document.getElementById('req-nom').value.trim();
    const email = document.getElementById('req-email').value.trim().toLowerCase();

    if (!prenom || !nom || !email) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    // Enregistrement de la demande dans utilisateurs_K1 avec valide = false par défaut
    const { error } = await supabase
        .from('utilisateurs_K1')
        .insert([{ prenom: prenom, nom: nom, email: email, valide: false }]);

    if (error) {
        alert("Erreur lors de l'enregistrement (peut-être que cet email existe déjà) : " + error.message);
    } else {
        // On sauvegarde l'email en local pour le mémoriser sur cet appareil
        localStorage.setItem('user_email_app', email);
        
        // On bascule sur l'affichage "en attente"
        document.getElementById('form-demande').style.display = 'none';
        document.getElementById('attente-validation').style.display = 'block';
    }
}
