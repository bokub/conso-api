# Migration 2026

Conso API migre progressivement des anciennes API Enedis vers l'API mesure synchrone v2. Enedis prévoit de couper les anciennes API legacy à la mi-octobre 2026. Après leur arrêt, les requêtes Conso API qui utilisent encore les anciens types de données échoueront.

Pour éviter une interruption, mettez à jour vos appels en utilisant les nouveaux types et noms de paramètres décrits ci-dessous.

## Types de données

Remplacez les types legacy par leur équivalent dans l'API mesure synchrone v2 :

| Ancien type              | Nouveau type                      |
| ------------------------ | --------------------------------- |
| `daily_consumption`      | `consommation_quotidienne`        |
| `consumption_load_curve` | `courbe_de_charge_consommation`   |
| `consumption_max_power`  | `puissance_conso_max_quotidienne` |
| `daily_production`       | `production_quotidienne`          |
| `production_load_curve`  | `courbe_de_charge_production`     |

L'API v2 propose également les types `index_consommation` et `index_production`, qui n'ont pas d'équivalent direct parmi les anciens types.

Pour `puissance_conso_max_quotidienne`, les paramètres `mesuresPas` (`P1D` ou `P1M`) et `grandeurPhysique` (`PMA` ou `TOUT`) sont facultatifs. Par défaut, Conso API utilise `P1D` et `PMA`.

## Paramètres

Renommez les paramètres de la requête comme suit :

| Ancien nom | Nouveau nom |
| ---------- | ----------- |
| `prm`      | `pointId`   |
| `start`    | `dateDebut` |
| `end`      | `dateFin`   |

Les anciens noms de paramètres restent acceptés comme solution de compatibilité. Il est néanmoins recommandé de passer aux nouveaux noms.

## Exemple

Avant :

```bash
curl 'https://conso.boris.sh/api/daily_consumption?prm=12345678901234&start=2026-09-01&end=2026-10-01' \
  -H 'Authorization: Bearer VOTRE_TOKEN'
```

Après :

```bash
curl 'https://conso.boris.sh/api/consommation_quotidienne?pointId=12345678901234&dateDebut=2026-09-01&dateFin=2026-10-01' \
  -H 'Authorization: Bearer VOTRE_TOKEN'
```

Le format de la réponse a changé et n'est plus du tout le même que celui de l'API legacy. Testez le nouveau format directement sur la page [exemples](/exemples).

Consultez la [documentation de l'API](/documentation) pour la liste complète des types et paramètres.
