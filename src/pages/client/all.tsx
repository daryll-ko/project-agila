import { createColumnHelper } from "@tanstack/react-table";
import { type GetServerSideProps } from "next";
import Head from "next/head";
import Layout from "~/components/Layout";
import prisma from "~/lib/prisma";
import { type Client, type Case, type Payment } from "@prisma/client";
import Link from "next/link";
import pingDelete from "~/utils/pingDelete";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from 'react';
import { useState, useMemo } from "react"; 
import Block from "~/components/Block";
import { getSession } from "next-auth/react"; 
import Selector from "~/components/SelectorTable";

interface Props {
  clients: Client[];
  cases: Case[];
  payments: Payment[];
}

interface Row {
  name?: string;
  id: number;
  date?: string | null | Date;
  amt?: number;
}

export default function AllClients({ clients, cases, payments }: Props) {

  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    !session ? router.push('/rerouter') : null
    })
  
  if (session?.user.isClient === true) {
    return <Block/>
  }

  const [selectedClientID, setSelectedClientID] = useState<number>();

  const caseSelect = (caseNum: number) => {
    router.push(`/case/${caseNum}`)
  }

  const selectedClient: Client | undefined = useMemo(() => {return clients.find((clientSelect) => clientSelect.ClientID === selectedClientID)},[selectedClientID])

  const clientData: Row[] = useMemo(() => {return clients.map((client) => ({
      name: (client.LastName && client.FirstName) ? (`${client.LastName}, ${client.FirstName} ${ client.MiddleName? client.MiddleName : null}`) : '',
      id: client.ClientID,
    }))
    .sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0))}, [clients]);

  const caseData: Row[] = useMemo(() => {return cases.filter((c) => c.ClientID == selectedClientID).map((c) => ({
    name: c.Title ? c.Title : c.CaseNum,
    id: parseInt(c.CaseNum),
  }))
  .sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0))}, [cases, selectedClient]);

  const payData: Row[] = useMemo(() => {return payments.filter((p) => p.ClientID == selectedClientID).map((p) => ({
    amt: p.Amount,
    date:  p.Date? (new Date(p.Date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
  })) : 'No Date',
    id: p.PaymentID
  }))
  .sort((a, b) => (a.amt > b.amt ? 1 : b.amt > a.amt ? -1 : 0))}, [payments, selectedClient]);

  const columnHelper = createColumnHelper<Row>();

  const clientColumns = useMemo(() => {return [

    columnHelper.accessor("name", {
      header: "Account Name",
    }),
  ]}, []);

  const caseColumns = useMemo(() => {return [

    columnHelper.accessor("name", {
      header: "Case Title",
    }),
  ]}, []);

  const payColumns = useMemo(() => {return [

    columnHelper.accessor("id", {
      header: "Payment Ref. No.",
      enableColumnFilter: false,
    }),
    columnHelper.accessor("amt", {
      header: "Amount",
    }),
    columnHelper.accessor("date", {
      header: "Date",
    }),
  ]}, []);

  return (
    <>
      <Head>
        <title>All Clients</title>
      </Head>
      <Layout>
        <main className="flex min-h-screen flex-col">
          <div className="z-10 my-auto flex flex-col items-center justify-center px-4 py-16 ">
            <div className="flex flex-row items-center gap-6 mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[3rem]">
                Accounts
              </h1>
              {session?.user.isAdmin && (
                <Link className="btn-blue" href="/client/new/">
                  <p>Add</p>
                </Link>
              )}
            </div>
            <div className="flex flex-row bg-white rounded-md p-1">
              <Selector data={clientData} columns={clientColumns} onRowSelect={setSelectedClientID} tailClass="flex flex-col bg-white min-h-72 min-w-64 rounded-l-md items-center justify-between"/>
              <table className="flex flex-col min-w-72 rounded-r-md text-left min-h-72 justify-center pr-4">
                <thead className="text-2xl">
                  <tr>
                    <th>{selectedClient? `${selectedClient?.LastName}, ${selectedClient?.FirstName} ${selectedClient?.MiddleName}` : 'Select an account'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-xl">{selectedClient?.CityAdd ? `${selectedClient?.CityAdd}` : ''}</td>
                  </tr>
                  <tr>
                    <td>{selectedClient?.TelNum ? `${selectedClient?.TelNum}` : ''}{(selectedClient?.TelNum && selectedClient?.CellNum) ? ' | ' : ''}{selectedClient?.CellNum ? `${selectedClient?.CellNum}` : ''}</td>
                  </tr>
                  <tr>
                    <td >{selectedClient?.Email ? `${selectedClient?.Email}` : ''}</td>
                  </tr>
                  { (session?.user.isAdmin && selectedClient && selectedClientID) ? 
                    ( <Link href={`/client/${selectedClientID}`} className="btn-blue">View</Link> ) : null
                  }
                </tbody>
              </table>
              <Selector selectorHighlight={false} data={caseData} columns={caseColumns} onRowSelect={caseSelect} tailClass="flex flex-col bg-white min-h-72 min-w-64 rounded-l-md items-center justify-between"/>
            </div>
            {session?.user.isAdmin ? (
              <Selector maxPageSize={3} data={payData} columns={payColumns} tailClass="mt-4 flex flex-col bg-white min-h-48 min-w-80 flex-grow rounded-md items-center justify-between"/>
            ) : null}
          </div>
        </main>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession({ req: context.req });

  let clients: Client[] = [];
  let cases: Case[] = [];
  let payments: Payment[] | { Date?: string; PaymentID: number; ClientID: number; Amount: number; }[]= [];

  if(session?.user.isAdmin) {
    clients = await prisma.client.findMany();
    cases = await prisma.case.findMany();
    payments = await prisma.payment.findMany();

    payments = payments.map(payment => ({
      ...payment,
      Date: payment.Date?.toISOString()
    }))

  } else if(session?.user.isLawyer) {
    cases = await prisma.case.findMany({
      include: {
        lawyers: true,
      },
      where: {
        lawyers: {
          some: {
            LawyerID: parseInt(session.user.id)
          }
        }
      }
    });

    const ClientIDs = cases.map(caseInstance => caseInstance.ClientID);
    clients = await prisma.client.findMany({
      where: {
        ClientID: {
          in: ClientIDs
        }
      }
    });
  } 

  return {
    props: { clients, cases, payments },
  };
};

