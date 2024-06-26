import Head from "next/head";

import { type GetServerSideProps } from "next";
import prisma from "~/lib/prisma";
import {
  type Case,
  type Work,
  type Contract,
  type Lawyer,
  type Client,
} from "@prisma/client";
import Layout from "~/components/Layout";
import { createColumnHelper } from "@tanstack/react-table";
import Table from "~/components/SelectorTable";
import pingDelete from "~/utils/pingDelete";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Form from "~/components/Form";
import { useSession } from "next-auth/react";
import Block from "~/components/Block";
import { useMemo } from "react";

interface Props {
  theCase: Case & {
    client: Client;
    contract: Contract;
    lawyers: Lawyer[];
    works: Work[];
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function Case({ theCase }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  const { client, contract, lawyers, works, ...obj } = theCase;
  const data: Work[] = works;

  const totalBill: string = useMemo(() => {
    const total = formatNumber(
      data.map((work) => work.FeeAmt ?? 0).reduce((acc, cur) => acc + cur, 0),
    );
    return total;
  }, [data]);

  if (!theCase) {
    return <Block title="Case not found" body="Case not found" />;
  }

  const columnHelper = createColumnHelper<Work>();
  const columns = [
    columnHelper.accessor("Title", {
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("Date", {
      cell: (info) => {
        const d = new Date(String(info.getValue()));
        return (
          <div>
            {d.getMonth() + 1}/{d.getDate()}/{d.getFullYear()}
          </div>
        );
      },
    }),
    columnHelper.accessor("FeeAmt", {
      header: "Fee Amount",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("WorkID", {
      header: "Actions",
      cell: (info) =>
        session?.user.isAdmin ? (
          <div className="flex flex-row items-center justify-center gap-2">
            <div className="flex flex-row gap-1">
              <Link className="btn-blue" href={`/work/${info.getValue()}`}>
                Edit
              </Link>
              <button
                className="btn-red"
                onClick={async () => {
                  await pingDelete("work", info.getValue());
                  router.refresh();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : session?.user.isClient ? (
          <div className="flex flex-row items-center justify-center gap-2">
            <div className="flex flex-row gap-1">
              <Link className="btn-blue" href={`/work/${info.getValue()}`}>
                View
              </Link>
            </div>
          </div>
        ) : null,
      enableColumnFilter: false,
      enableSorting: false,
    }),
  ];

  if (
    session == null ||
    (!session.user.isAdmin &&
      session.user.isLawyer &&
      !lawyers.some((l) => l.LawyerID === Number(session.user.id)))
  ) {
    return <Block />;
  }

  return (
    <>
      <Head>
        <title>Case Information</title>
      </Head>

      <Layout>
        <main className="flex h-screen w-screen flex-row items-center justify-center">
          <div className="z-10 flex h-104 w-5/6 min-w-308 flex-row justify-center">
            <div className="h-full">
              {" "}
              {/* Assigned Lawyers DIV */}
              <div className="flex h-full flex-col justify-center">
                <h1 className="text-center font-bold tracking-tight text-white sm:text-[2rem]">
                  Lawyers
                </h1>

                <div className="flex flex-grow flex-col gap-1 rounded-l-md bg-white pt-5">
                  {lawyers.map((lawyer, index) => (
                    <div
                      key={index}
                      className="flex flex-row items-center justify-between gap-1 px-3 py-2 font-bold"
                    >
                      <p>{`${lawyer.LastName}, ${lawyer.FirstName} ${lawyer.MiddleName}`}</p>
                      {/* <button className="btn-red">Delete</button> */}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="h-full">
              {" "}
              {/* Form DIV*/}
              <Form
                obj={obj}
                type="case"
                name="Case"
                keys={["CaseNum", "ContractID", "ClientID"]}
                hide={[]}
                textarea={["Status"]}
                identifier={(c: Case) => c.CaseNum}
                adding={false}
                stay={true}
                authorized={session.user.isAdmin}
                outerTailClass="z-10 mx-auto my-auto flex flex-col h-full"
                firstTailClass="flex flex-row items-center justify-center gap-6"
                secondTailClass="grid grid-cols-2 gap-3 bg-white h-full p-3"
              />
            </div>
            <div className="flex h-full flex-col">
              {" "}
              {/* Works DIV */}
              <div className="flex flex-row items-center justify-center gap-6">
                <h1 className="text-center font-bold tracking-tight text-white sm:text-[2rem]">
                  Work Involved
                </h1>

                {(session.user.isAdmin || session.user.isLawyer) && (
                  <Link
                    className="btn-blue"
                    href={`/work/new/${theCase.CaseNum}`}
                  >
                    <p>Add</p>
                  </Link>
                )}
              </div>
              <Table
                selectorHighlight={false}
                maxPageSize={5}
                data={data}
                columns={columns}
                tailClass="flex flex-col bg-white min-w-64 rounded-tr-md items-center flex-grow justify-between"
              />
              <p className="flex flex-row items-center justify-start gap-5 rounded-br-md bg-white p-2">
                <span className="rounded-md bg-gray-700 px-3 pb-1 pt-2 text-white">
                  Total Billing
                </span>
                <span className="mr-1 font-bold">Php {totalBill}</span>
              </p>
            </div>
          </div>
        </main>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const theCase = await prisma.case.findUnique({
    where: {
      CaseNum: String(params?.id),
    },
    include: {
      client: true,
      contract: true,
      lawyers: true,
      works: true,
    },
  });
  return {
    props: { theCase: JSON.parse(JSON.stringify(theCase)) },
  };
};
