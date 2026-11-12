package com.rancho.dragones.logic

import com.rancho.dragones.model.Dragon
import com.rancho.dragones.model.Egg
import com.rancho.dragones.model.Element
import com.rancho.dragones.model.GameState
import com.rancho.dragones.model.Habitat
import com.rancho.dragones.model.Species
import com.rancho.dragones.model.SpeciesCatalog
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.random.Random

/** Resultado de una acción: o un valor, o un mensaje de error en español. */
class Outcome<T>(val value: T?, val error: String?) {
    val ok: Boolean get() = error == null

    companion object {
        fun <T> ok(v: T) = Outcome(v, null)
        fun <T> fail(msg: String) = Outcome<T>(null, msg)
    }
}

object Rules {
    const val MAX_LEVEL = 20
    const val HABITAT_CAPACITY = 3
    const val MAX_HABITATS = 9
    const val HATCHERY_SLOTS = 2
    const val FOOD_XP = 15
    const val FOOD_PACK = 5
    const val FOOD_PACK_PRICE = 100
    const val GEM_PACK = 2
    const val GEM_PACK_PRICE = 1000
    const val GOLD_CAP_MINUTES = 120.0
    const val MAX_OFFLINE_MINUTES = 7 * 24 * 60.0
    const val RESULT_HYBRID_CHANCE = 0.85

    // ---------- Estadísticas y nivel ----------

    private fun scale(base: Int, level: Int): Int = (base * (1 + 0.15 * (level - 1))).roundToInt()

    fun maxHp(d: Dragon): Int = scale(d.species.baseHp, d.level)
    fun attack(d: Dragon): Int = scale(d.species.baseAtk, d.level)
    fun xpToNext(level: Int): Int = 30 * level

    /** Suma experiencia y sube de nivel las veces que haga falta. Devuelve los niveles ganados. */
    fun addXp(d: Dragon, amount: Int): Int {
        var gained = 0
        if (d.level >= MAX_LEVEL) return 0
        d.xp += amount
        while (d.level < MAX_LEVEL && d.xp >= xpToNext(d.level)) {
            d.xp -= xpToNext(d.level)
            d.level++
            gained++
        }
        if (d.level >= MAX_LEVEL) d.xp = 0
        return gained
    }

    // ---------- Producción de oro ----------

    fun goldPerMin(d: Dragon): Double = d.species.goldPerMin * (1 + 0.1 * (d.level - 1))

    fun habitatRate(state: GameState, h: Habitat): Double =
        h.dragonIds.mapNotNull { state.dragon(it) }.sumOf { goldPerMin(it) }

    fun habitatCap(state: GameState, h: Habitat): Double = habitatRate(state, h) * GOLD_CAP_MINUTES

    /** Hace avanzar el tiempo: acumula oro en cada hábitat hasta su tope. */
    fun advance(state: GameState, now: Long) {
        val minutes = ((now - state.lastTickAt) / 60000.0).coerceIn(0.0, MAX_OFFLINE_MINUTES)
        state.lastTickAt = now
        if (minutes <= 0) return
        for (h in state.habitats) {
            val cap = habitatCap(state, h)
            h.pendingGold = min(cap, h.pendingGold + habitatRate(state, h) * minutes)
        }
    }

    fun collect(state: GameState, habitatId: Long): Int {
        val h = state.habitats.firstOrNull { it.id == habitatId } ?: return 0
        val whole = floor(h.pendingGold).toInt()
        h.pendingGold -= whole
        state.gold += whole
        return whole
    }

    // ---------- Compras ----------

    fun habitatCost(state: GameState): Int = 250 * state.habitats.size

    fun buyHabitat(state: GameState, element: Element, slot: Int? = null): Outcome<Habitat> {
        if (state.habitats.size >= MAX_HABITATS) return Outcome.fail("La isla está llena")
        if (slot != null && (slot !in 0 until MAX_HABITATS || state.habitats.any { it.slot == slot })) {
            return Outcome.fail("Esa casilla no está libre")
        }
        val cost = habitatCost(state)
        if (state.gold < cost) return Outcome.fail("Te faltan ${cost - state.gold} de oro")
        val used = state.habitats.map { it.slot }.toSet()
        val chosen = slot ?: (0 until MAX_HABITATS).first { it !in used }
        state.gold -= cost
        val h = Habitat(state.newId(), element, chosen)
        state.habitats.add(h)
        return Outcome.ok(h)
    }

    fun buyDragon(state: GameState, speciesId: String): Outcome<Dragon> {
        val sp = SpeciesCatalog.get(speciesId)
        if (sp.price <= 0) return Outcome.fail("Este dragón no se vende")
        if (state.gold < sp.price) return Outcome.fail("Te faltan ${sp.price - state.gold} de oro")
        state.gold -= sp.price
        val d = Dragon(state.newId(), sp.id)
        state.dragons.add(d)
        return Outcome.ok(d)
    }

    fun buyFood(state: GameState): String? {
        if (state.gold < FOOD_PACK_PRICE) return "Te faltan ${FOOD_PACK_PRICE - state.gold} de oro"
        state.gold -= FOOD_PACK_PRICE
        state.food += FOOD_PACK
        return null
    }

    fun buyGems(state: GameState): String? {
        if (state.gold < GEM_PACK_PRICE) return "Te faltan ${GEM_PACK_PRICE - state.gold} de oro"
        state.gold -= GEM_PACK_PRICE
        state.gems += GEM_PACK
        return null
    }

    // ---------- Hábitats y dragones ----------

    fun canLiveIn(d: Dragon, h: Habitat): Boolean = h.element in d.species.elements

    fun place(state: GameState, dragonId: Long, habitatId: Long): String? {
        val d = state.dragon(dragonId) ?: return "Dragón no encontrado"
        val h = state.habitats.firstOrNull { it.id == habitatId } ?: return "Hábitat no encontrado"
        if (state.habitatOf(dragonId) != null) return "Ese dragón ya vive en un hábitat"
        if (!canLiveIn(d, h)) return "Este hábitat es de ${h.element.label}"
        if (h.dragonIds.size >= HABITAT_CAPACITY) return "El hábitat está lleno"
        h.dragonIds.add(dragonId)
        return null
    }

    fun remove(state: GameState, dragonId: Long) {
        state.habitatOf(dragonId)?.let { h ->
            // El oro pendiente no puede superar el nuevo tope.
            h.dragonIds.remove(dragonId)
            h.pendingGold = min(h.pendingGold, habitatCap(state, h))
        }
    }

    fun feed(state: GameState, dragonId: Long): String? {
        val d = state.dragon(dragonId) ?: return "Dragón no encontrado"
        if (d.level >= MAX_LEVEL) return "${d.species.nombre} ya está al nivel máximo"
        if (state.food <= 0) return "No te queda comida"
        state.food--
        addXp(d, FOOD_XP)
        return null
    }

    fun sellPrice(d: Dragon): Int = 40 * d.level * d.species.tier

    fun sell(state: GameState, dragonId: Long): String? {
        val d = state.dragon(dragonId) ?: return "Dragón no encontrado"
        if (state.dragons.size <= 1) return "No puedes vender tu último dragón"
        remove(state, dragonId)
        state.dragons.remove(d)
        state.gold += sellPrice(d)
        return null
    }

    // ---------- Fusión y huevos ----------

    /** Calcula la especie resultante de fusionar dos especies. */
    fun fusionResult(a: Species, b: Species, rng: Random): Species {
        val ea = a.elements.random(rng)
        val eb = b.elements.random(rng)
        if (ea == eb) return SpeciesCatalog.basicOf(ea)
        val hybrid = SpeciesCatalog.hybridFor(ea, eb)
        return if (hybrid != null && rng.nextDouble() < RESULT_HYBRID_CHANCE) hybrid
        else SpeciesCatalog.basicOf(listOf(ea, eb).random(rng))
    }

    fun startFusion(state: GameState, aId: Long, bId: Long, now: Long, rng: Random): Outcome<Egg> {
        if (aId == bId) return Outcome.fail("Elige dos dragones distintos")
        val a = state.dragon(aId) ?: return Outcome.fail("Dragón no encontrado")
        val b = state.dragon(bId) ?: return Outcome.fail("Dragón no encontrado")
        if (state.eggs.size >= HATCHERY_SLOTS) return Outcome.fail("El criadero está lleno")
        val result = fusionResult(a.species, b.species, rng)
        val egg = Egg(result.id, now + result.incubationSec * 1000L, a.speciesId, b.speciesId)
        state.eggs.add(egg)
        return Outcome.ok(egg)
    }

    fun remainingSec(egg: Egg, now: Long): Int = max(0, ceil((egg.readyAt - now) / 1000.0).toInt())

    fun speedUpCost(egg: Egg, now: Long): Int {
        val rem = remainingSec(egg, now)
        return if (rem <= 0) 0 else max(1, ceil(rem / 60.0).toInt())
    }

    fun speedUp(state: GameState, eggIndex: Int, now: Long): String? {
        val egg = state.eggs.getOrNull(eggIndex) ?: return "Huevo no encontrado"
        val cost = speedUpCost(egg, now)
        if (cost == 0) return null
        if (state.gems < cost) return "Te faltan ${cost - state.gems} gemas"
        state.gems -= cost
        state.eggs[eggIndex] = Egg(egg.speciesId, now, egg.parentA, egg.parentB)
        return null
    }

    fun hatch(state: GameState, eggIndex: Int, now: Long): Outcome<Dragon> {
        val egg = state.eggs.getOrNull(eggIndex) ?: return Outcome.fail("Huevo no encontrado")
        if (remainingSec(egg, now) > 0) return Outcome.fail("El huevo aún no está listo")
        state.eggs.removeAt(eggIndex)
        val d = Dragon(state.newId(), egg.speciesId)
        state.dragons.add(d)
        return Outcome.ok(d)
    }
}
