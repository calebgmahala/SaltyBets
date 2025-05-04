"use client";
import { ApolloClient, InMemoryCache, ApolloProvider, HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import Cookies from "js-cookie";
import React from "react";

// ============================================
// Apollo Client Setup with Auth Link
// ============================================

/**
 * ApolloProviderWrapper sets up Apollo Client with JWT auth and provides it to children.
 * @param {object} props - The provider props.
 * @param {React.ReactNode} props.children - The app content.
 * @returns {React.ReactElement} The wrapped children with ApolloProvider.
 */
const authLink = setContext((_, { headers }) => {
  const token = Cookies.get("token");
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const httpLink = new HttpLink({ uri: "http://localhost:4000/graphql", credentials: "include" });

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default function ApolloProviderWrapper({ children }: { children: React.ReactNode }): React.ReactElement {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
} 