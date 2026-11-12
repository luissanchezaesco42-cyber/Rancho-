package com.rancho.dragones.ui

import com.rancho.dragones.logic.Outcome
import com.rancho.dragones.logic.Rules
import com.rancho.dragones.model.Dragon
import com.rancho.dragones.model.Element
import com.rancho.dragones.model.GameState
import kotlin.random.Random

/**
 * Punto de entrada de la interfaz a las reglas: aplica la acción, avisa con un
 * mensaje y guarda. Las pantallas solo hablan con esta clase.
 */
class Game(
    var state: GameState,
    private val onSave: (GameState) -> Unit = {},
    private val clock: () -> Long = System::currentTimeMillis,
    val rng: Random = Random.Default,
) {
    var toastText: String? = null
        private set
    private var toastUntil = 0L

    fun now(): Long = clock()

    fun toast(msg: String) {
        toastText = msg
        toastUntil = now() + 2200
    }

    fun currentToast(): String? = if (now() < toastUntil) toastText else null

    fun tick() = Rules.advance(state, now())

    fun save() = onSave(state)

    private fun <T> report(o: Outcome<T>, ok: String): T? {
        if (o.ok) toast(ok) else toast(o.error ?: "Error")
        save()
        return o.value
    }

    private fun report(error: String?, ok: String): Boolean {
        toast(error ?: ok)
        save()
        return error == null
    }

    fun collect(habitatId: Long) {
        val got = Rules.collect(state, habitatId)
        if (got > 0) {
            toast("+$got de oro")
            save()
        }
    }

    fun buyHabitat(e: Element, slot: Int) = report(Rules.buyHabitat(state, e, slot), "Hábitat de ${e.label} construido")

    fun buyDragon(speciesId: String): Dragon? = report(Rules.buyDragon(state, speciesId), "¡Nuevo dragón!")

    fun buyFood() = report(Rules.buyFood(state), "+${Rules.FOOD_PACK} de comida")

    fun buyGems() = report(Rules.buyGems(state), "+${Rules.GEM_PACK} gemas")

    fun place(dragonId: Long, habitatId: Long) = report(Rules.place(state, dragonId, habitatId), "Dragón colocado")

    fun remove(dragonId: Long) {
        Rules.remove(state, dragonId)
        toast("Dragón retirado")
        save()
    }

    fun feed(dragonId: Long) {
        val before = state.dragon(dragonId)?.level ?: 0
        val err = Rules.feed(state, dragonId)
        val after = state.dragon(dragonId)?.level ?: 0
        report(err, if (after > before) "¡Subió al nivel $after!" else "+${Rules.FOOD_XP} XP")
    }

    fun sell(dragonId: Long): Boolean {
        val price = state.dragon(dragonId)?.let { Rules.sellPrice(it) } ?: 0
        return report(Rules.sell(state, dragonId), "Vendido por $price de oro")
    }

    fun startFusion(a: Long, b: Long): Boolean =
        report(Rules.startFusion(state, a, b, now(), rng), "El huevo se está incubando") != null

    fun speedUp(i: Int) = report(Rules.speedUp(state, i, now()), "¡Huevo acelerado!")

    fun hatch(i: Int): Dragon? = report(Rules.hatch(state, i, now()), "¡Ha nacido un dragón!")
}
