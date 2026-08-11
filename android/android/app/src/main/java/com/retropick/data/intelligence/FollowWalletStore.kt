package com.retropick.data.intelligence

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class FollowWalletStore {
    private val _followedAddresses = MutableStateFlow<Set<String>>(
        setOf("0x71C7656EC7ab88b098defB751B7401B5f6d8976F") // Default followed SatoshiWhale
    )
    val followedAddresses: StateFlow<Set<String>> = _followedAddresses.asStateFlow()

    fun isFollowing(address: String): Boolean {
        return _followedAddresses.value.any { it.equals(address, ignoreCase = true) }
    }

    fun toggleFollow(address: String): Boolean {
        val current = _followedAddresses.value.toMutableSet()
        val normalized = address.lowercase()
        val isNowFollowing = if (current.contains(normalized)) {
            current.remove(normalized)
            false
        } else {
            current.add(normalized)
            true
        }
        _followedAddresses.value = current
        return isNowFollowing
    }
}
