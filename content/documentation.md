# Documentation

Le moyen le plus simple d'accéder aux données de Conso API est le module [@bokub/linky](https://github.com/bokub/linky#readme), mais il est également possible d'appeler directement l'API avec le langage de votre choix.

Toutes les routes de Conso API suivent le format suivant:

```git-commit
https://conso.boris.sh/api/:type?prm=:prm&start=:start&end=:end
                           ──┬──      ─┬─        ──┬──      ─┬─
                             │         │           │         └─ Fin de la plage demandée
                             │         │           │
                             │         │           └─ Début de la plage demandée
                             │         │
                             │        Identifiant du point de livraison (PRM)
                             │
                            Type de donnée à récupérer
```

### Exemple

Pour récupérer la consommation de chaque jour du mois de janvier 2023 pour le PRM 12345, la route à appeler est la suivante :

```yaml
https://conso.boris.sh/api/daily_consumption?prm=12345&start=2023-01-01&end=2023-02-01
```

Plus d'exemples d'utilisation sont disponibles sur la page [exemples](/exemples).

## Paramètres

### Type de donnée

Les valeurs possibles pour `:type` sont les suivantes:

#### Données de consommation

- `daily_consumption`: Consommation quotidienne
- `consumption_load_curve`: Courbe de charge (puissance moyenne de consommation sur des intervalles de 30 minutes)
- `consumption_max_power`: Puissance maximale de consommation atteinte quotidiennement

#### Données de production

- `daily_production`: Production quotidienne
- `production_load_curve`: Courbe de charge (puissance moyenne produite sur des intervalles de 30 minutes)

### PRM

Une suite de 14 chiffres qui identifie votre compteur Linky. Vous pouvez le trouver sur votre compteur en appuyant sur la touche :icon{name="mdi:plus-circle-outline"} jusqu’à lire la valeur du "numéro de PRM".

### Start et end

`:start` et `:end` sont les dates de début et fin de l'échantillon demandé, au format `YYYY-MM-DD`.

La date de début est incluse, mais pas la date de fin.

Par exemple, si `:start` vaut `2022-12-01` et end vaut `2022-12-03`, la réponse contiendra les données du 1 et 2 décembre, mais pas les données du 3.

## Authentification

Chaque appel à l'API doit être authentifié avec votre token personnel, qui vous est communiqué à la fin de l'étape de consentement.

Ce token doit être communiqué dans le header `Authorization` au format suivant (remplacez `xxx.yyy.zzz` par votre token) :

```yaml
Authorization: Bearer xxx.yyy.zzz
```

## Codes HTTP de retour

Le code HTTP retourné par Conso API vous permet de déterminer si tout s'est bien passé, ou la raison d'une potentielle erreur.

- **200**: Tout s'est bien passé, les données sont dans le body de la réponse.
- **400**: Votre requête n'est pas valide. Il est inutile de réessayer, il faut corriger la façon dont vous appelez l'API.
- **401**: Votre token est invalide ou ne permet pas d'accéder à ce PRM.
- **500**: Une erreur interne s'est produite, chez Enedis ou chez Conso API. Réessayez dans quelques minutes ou quelques heures, et ouvrez une nouvelle [issue](https://github.com/bokub/conso-api/issues) si le problème persiste.

## Pour les développeurs

Si vous utilisez Conso API dans une librairie, une application, ou tout autre service à **destination du grand public**, renseignez dans le header `User-Agent` une chaîne de caractères permettant d'identifier clairement les requêtes depuis votre service et d'éviter les blocages.

Faites en sorte que ce `User-Agent` soit assez clair pour que je puisse trouver votre projet sans difficulté si j'ai besoin de vous contacter, ou ajoutez un e-mail de contact dans le header `From`

```yaml
# Vous pouvez renseigner le nom de votre projet
User-Agent: Librairie exemple v1.2.3

# Ou bien un repo GitHub
User-Agent: github.com/exemple/service

# Ou encore un site web
User-Agent: mon-service-exemple.fr

# Ou n'importe quelle autre info me permettant de vous contacter
User-Agent: Mon application (iOS)
From: contact@exemple.fr
```
