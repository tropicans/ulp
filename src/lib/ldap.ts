import { Client, SearchOptions } from 'ldapts'

export interface LDAPUser {
    dn: string
    nip: string
    email: string
    name: string
    unitKerja?: string
    jabatan?: string
}

export async function authenticateWithLDAP(
    username: string,
    password: string
): Promise<LDAPUser | null> {
    // Skip if LDAP not configured
    if (!process.env.LDAP_URL) {
        return null
    }

    const client = new Client({
        url: process.env.LDAP_URL,
        timeout: 5000,
        connectTimeout: 5000,
    })

    try {
        // Bind with service account
        await client.bind(
            process.env.LDAP_BIND_DN!,
            process.env.LDAP_BIND_PASSWORD!
        )

        // Search for user
        const searchFilter = (process.env.LDAP_SEARCH_FILTER || '(uid={{username}})')
            .replace('{{username}}', username)

        const searchOptions: SearchOptions = {
            scope: 'sub',
            filter: searchFilter,
            attributes: ['dn', 'uid', 'mail', 'cn', 'displayName', 'ou', 'title'],
        }

        const { searchEntries } = await client.search(
            process.env.LDAP_SEARCH_BASE!,
            searchOptions
        )

        if (searchEntries.length === 0) {
            return null
        }

        const userEntry = searchEntries[0]
        const userDn = userEntry.dn

        // Try to bind as the user to verify password
        const userClient = new Client({
            url: process.env.LDAP_URL,
            timeout: 5000,
            connectTimeout: 5000,
        })

        try {
            await userClient.bind(userDn, password)
            await userClient.unbind()
        } catch {
            // Invalid password
            return null
        }

        // Extract user info
        const user: LDAPUser = {
            dn: userDn,
            nip: (userEntry.uid as string) || username,
            email: (userEntry.mail as string) || `${username}@example.com`,
            name: (userEntry.displayName as string) || (userEntry.cn as string) || username,
            unitKerja: userEntry.ou as string | undefined,
            jabatan: userEntry.title as string | undefined,
        }

        return user
    } catch (error) {
        console.error('LDAP authentication error:', error)
        return null
    } finally {
        await client.unbind()
    }
}

export async function searchLDAPUsers(
    query: string,
    limit = 10
): Promise<LDAPUser[]> {
    if (!process.env.LDAP_URL) {
        return []
    }

    const client = new Client({
        url: process.env.LDAP_URL,
        timeout: 5000,
        connectTimeout: 5000,
    })

    try {
        await client.bind(
            process.env.LDAP_BIND_DN!,
            process.env.LDAP_BIND_PASSWORD!
        )

        const searchOptions: SearchOptions = {
            scope: 'sub',
            filter: `(|(uid=*${query}*)(cn=*${query}*)(mail=*${query}*))`,
            attributes: ['dn', 'uid', 'mail', 'cn', 'displayName', 'ou', 'title'],
            sizeLimit: limit,
        }

        const { searchEntries } = await client.search(
            process.env.LDAP_SEARCH_BASE!,
            searchOptions
        )

        return searchEntries.map(entry => ({
            dn: entry.dn,
            nip: (entry.uid as string) || '',
            email: (entry.mail as string) || '',
            name: (entry.displayName as string) || (entry.cn as string) || '',
            unitKerja: entry.ou as string | undefined,
            jabatan: entry.title as string | undefined,
        }))
    } catch (error) {
        console.error('LDAP search error:', error)
        return []
    } finally {
        await client.unbind()
    }
}
